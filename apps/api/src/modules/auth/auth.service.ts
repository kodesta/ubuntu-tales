import { randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ERROR_CODES,
  type ForgotPasswordResponse,
  type UserMe,
  type VerifyEmailResponse,
} from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../../common/errors/app-exception';
import type { RequestMeta } from '../../common/auth/auth.types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  USER_ME_INCLUDE,
  toUserMe,
  type UserRow,
} from '../users/user.mapper';
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '../users/users.dto';
import {
  RESET_PASSWORD_TTL_MS,
  VERIFY_EMAIL_TTL_MS,
} from './email.templates';
import { EmailService } from './email.service';
import { PasswordService, needsRehash } from './password.service';
import { LoginThrottle, RESEND_LIMIT, RESEND_WINDOW_MS, SlidingWindowLimiter } from './rate-limit';
import { TokenService } from './token.service';
import { generateOpaqueToken, sha256Hex } from './token.util';

/** Policy versions recorded in `UserConsent` (bump when the legal pages change). */
export const CONSENT_VERSION = '2026-11-01';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: UserMe;
  /** Dev/staging only — lets the SPA/e2e verify email without opening Mailpit. */
  devEmailToken?: string;
}

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof USER_ME_INCLUDE }>;

/** IPv4/IPv6 literal or null; keeps malformed proxy headers out of the `@db.Inet` column. */
export function sanitiseIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  return isIP(trimmed) === 0 ? null : trimmed;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/**
 * All account lifecycle rules from production plan 03 §2.2 / 05 §3.2: registration with consent
 * records, argon2id credentials, HIBP fail-open checks, in-memory lockout, rotating refresh tokens
 * with family reuse detection, single-use hashed verification/reset tokens and session-version
 * invalidation.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginThrottle = new LoginThrottle();
  private readonly resendLimiter = new SlidingWindowLimiter(RESEND_LIMIT, RESEND_WINDOW_MS);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
  ) {}

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  // ───────────── Registration / login ─────────────

  async register(input: RegisterDto, meta: RequestMeta): Promise<AuthSession> {
    this.assertLineageConsent(input);
    const hasTribe = typeof input.tribeId === 'string' && input.tribeId.length > 0;
    const customLineage = input.customLineage?.trim() ?? '';
    const hasCustomLineage = customLineage.length > 0;

    if (hasTribe) {
      const tribe = await this.prisma.tribe.findFirst({
        where: { id: input.tribeId, isActive: true },
        select: { id: true },
      });
      if (!tribe) {
        throw AppException.validation('Choose a valid tribe.', [
          { field: 'tribeId', message: 'That tribe does not exist.' },
        ]);
      }
    }

    await this.passwords.assertAcceptable(input.password);

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) throw this.emailTaken();

    const passwordHash = await this.passwords.hash(input.password);
    const displayName = input.displayName.trim();

    try {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            displayName,
            passwordHash,
            tribeId: hasTribe ? (input.tribeId as string) : null,
            customLineage: hasCustomLineage ? customLineage : null,
            lineageLabel: hasCustomLineage ? customLineage : null,
            communityRole: input.communityRole ?? null,
            locale: 'en',
          },
          select: { id: true },
        });

        await tx.userStats.create({ data: { userId: user.id } });

        const consents: Prisma.UserConsentCreateManyInput[] = [
          { userId: user.id, type: 'terms', version: CONSENT_VERSION, granted: input.acceptTerms },
          {
            userId: user.id,
            type: 'privacy',
            version: CONSENT_VERSION,
            granted: input.acceptPrivacy,
          },
        ];
        if (hasTribe || hasCustomLineage) {
          consents.push({
            userId: user.id,
            type: 'lineage_personalisation',
            version: CONSENT_VERSION,
            granted: input.consentLineagePersonalisation === true,
          });
        }
        await tx.userConsent.createMany({ data: consents });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw this.emailTaken();
      throw error;
    }

    const user = await this.getUserWithRelations(email);
    const session = await this.issueSession(user, meta);
    const devEmailToken = await this.createAndSendVerificationEmail(user);
    return {
      ...session,
      ...(devEmailToken && !this.isProduction() ? { devEmailToken } : {}),
    };
  }

  async login(input: LoginDto, meta: RequestMeta): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();

    const lock = this.loginThrottle.isLocked(email);
    if (lock.locked) {
      throw new AppException(
        ERROR_CODES.AUTH_ACCOUNT_LOCKED,
        429,
        `Too many failed sign-in attempts. Try again in ${Math.max(
          1,
          Math.ceil(lock.retryAfterSeconds / 60),
        )} minute(s).`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: USER_ME_INCLUDE,
    });

    if (!user || !user.passwordHash || user.status !== 'ACTIVE') {
      this.loginThrottle.recordFailure(email);
      throw this.invalidCredentials();
    }

    const passwordOk = await this.passwords.verify(user.passwordHash, input.password);
    if (!passwordOk) {
      this.loginThrottle.recordFailure(email);
      throw this.invalidCredentials();
    }

    this.loginThrottle.reset(email);

    // Opportunistically upgrade hashes produced with older argon2 parameters (plan 05 §3.2).
    const passwordHash = needsRehash(user.passwordHash)
      ? await this.passwords.hash(input.password)
      : user.passwordHash;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), passwordHash },
    });

    return this.issueSession({ ...user, passwordHash }, meta);
  }

  // ───────────── Refresh rotation / logout ─────────────

  async refresh(rawToken: string | null, meta: RequestMeta): Promise<AuthSession> {
    if (!rawToken) throw this.sessionExpired();

    const tokenHash = sha256Hex(rawToken);
    const now = new Date();
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: USER_ME_INCLUDE } },
    });

    if (!stored) throw this.sessionExpired();

    if (stored.revokedAt !== null) {
      // Reuse detection: a rotated (or logged-out) token was presented. Revoke the whole family so
      // a stolen token cannot keep a session alive (plan 05 §3.2).
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: now },
      });
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; family revoked.`);
      throw new AppException(
        ERROR_CODES.AUTH_REFRESH_REUSED,
        401,
        'This session was already rotated. For your safety every session in that family has been revoked — please sign in again.',
      );
    }

    if (stored.expiresAt.getTime() <= now.getTime()) {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: now } });
      throw this.sessionExpired();
    }

    if (stored.user.status !== 'ACTIVE') {
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: now } });
      throw this.invalidCredentials();
    }

    const value = this.tokens.createRefreshTokenValue();
    const expiresAt = this.tokens.refreshTokenExpiry(now);
    await this.prisma.$transaction(async (tx) => {
      const next = await tx.refreshToken.create({
        data: {
          userId: stored.userId,
          familyId: stored.familyId,
          tokenHash: this.tokens.hashToken(value),
          expiresAt,
          userAgent: this.userAgent(meta),
          ip: sanitiseIp(meta.ip),
        },
        select: { id: true },
      });
      await tx.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now, replacedById: next.id },
      });
    });

    const accessToken = await this.tokens.signAccessToken({
      id: stored.user.id,
      systemRole: stored.user.systemRole,
      sessionVersion: stored.user.sessionVersion,
    });

    return {
      accessToken,
      refreshToken: value,
      refreshExpiresAt: expiresAt,
      user: toUserMe(stored.user),
    };
  }

  /** Revokes the presented refresh token (idempotent); the cookie is cleared by the controller. */
  async logout(rawToken: string | null): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256Hex(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Sign out everywhere: revoke all sessions and bump `sessionVersion` (invalidates access JWTs). */
  async logoutAll(userId: string): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
      }),
    ]);
  }

  // ───────────── Email verification ─────────────

  async verifyEmail(input: VerifyEmailDto): Promise<VerifyEmailResponse> {
    const tokenHash = sha256Hex(input.token);
    const token = await this.prisma.emailToken.findFirst({
      where: { tokenHash, type: 'VERIFY_EMAIL' },
    });

    if (!token || token.usedAt !== null || token.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        ERROR_CODES.AUTH_INVALID_TOKEN,
        400,
        'This verification link is invalid or has expired. Request a new one from the app.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
      await tx.user.update({
        where: { id: token.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });

    return { user: await this.getUserMe(token.userId) };
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailVerifiedAt: true,
      },
    });
    if (!user) throw AppException.notFound('Account');
    if (user.emailVerifiedAt !== null) return; // already verified: no email, no rate-limit cost

    if (!this.resendLimiter.tryConsume(userId)) {
      throw new AppException(
        ERROR_CODES.RATE_LIMITED,
        429,
        `You can request at most ${RESEND_LIMIT} verification emails per hour. Try again later.`,
      );
    }

    await this.prisma.emailToken.updateMany({
      where: { userId, type: 'VERIFY_EMAIL', usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.createAndSendVerificationEmail(user);
  }

  // ───────────── Password reset ─────────────

  async forgotPassword(input: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, status: true },
    });

    // Always answer the same way so the endpoint cannot be used to enumerate accounts (plan 08 §1).
    if (!user || user.status !== 'ACTIVE') return { ok: true };

    const now = new Date();
    await this.prisma.emailToken.updateMany({
      where: { userId: user.id, type: 'RESET_PASSWORD', usedAt: null },
      data: { usedAt: now },
    });

    const rawToken = generateOpaqueToken(32);
    await this.prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'RESET_PASSWORD',
        tokenHash: sha256Hex(rawToken),
        expiresAt: new Date(now.getTime() + RESET_PASSWORD_TTL_MS),
      },
    });

    await this.email.sendPasswordResetEmail(
      { email: user.email, displayName: user.displayName },
      rawToken,
    );

    return this.isProduction() ? { ok: true } : { ok: true, devResetToken: rawToken };
  }

  async resetPassword(input: ResetPasswordDto): Promise<void> {
    await this.passwords.assertAcceptable(input.newPassword, 'newPassword');

    const tokenHash = sha256Hex(input.token);
    const token = await this.prisma.emailToken.findFirst({
      where: { tokenHash, type: 'RESET_PASSWORD' },
    });

    if (!token || token.usedAt !== null || token.expiresAt.getTime() <= Date.now()) {
      throw new AppException(
        ERROR_CODES.AUTH_INVALID_TOKEN,
        400,
        'This password reset link is invalid or has expired. Request a new one.',
      );
    }

    const passwordHash = await this.passwords.hash(input.newPassword);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.emailToken.update({ where: { id: token.id }, data: { usedAt: now } });
      await tx.emailToken.updateMany({
        where: { userId: token.userId, type: 'RESET_PASSWORD', usedAt: null },
        data: { usedAt: now },
      });
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      });
    });
  }

  /**
   * Issues a brand-new session for an already-authenticated user. Used after a password change:
   * every old refresh token is revoked and `sessionVersion` is bumped, then the current device gets
   * a fresh cookie so it is not signed out alongside the other sessions.
   */
  async createSessionForUser(userId: string, meta: RequestMeta = {}): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_ME_INCLUDE,
    });
    if (!user) throw AppException.notFound('Account');
    return this.issueSession(user, meta);
  }

  async getUserMe(userId: string): Promise<UserMe> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_ME_INCLUDE,
    });
    if (!user) throw AppException.notFound('Account');
    return toUserMe(user);
  }

  // ───────────── Internals ─────────────

  private assertLineageConsent(input: RegisterDto): void {
    const hasTribe = typeof input.tribeId === 'string' && input.tribeId.length > 0;
    const hasCustomLineage =
      typeof input.customLineage === 'string' && input.customLineage.trim().length > 0;

    if (hasTribe && hasCustomLineage) {
      throw AppException.validation('Choose either a tribe or a custom lineage, not both.', [
        { field: 'tribeId', message: 'Choose either a tribe or a custom lineage, not both.' },
        { field: 'customLineage', message: 'Choose either a tribe or a custom lineage, not both.' },
      ]);
    }
    if ((hasTribe || hasCustomLineage) && input.consentLineagePersonalisation !== true) {
      throw AppException.validation(
        'Sharing your roots is optional and needs consent: set consentLineagePersonalisation to true.',
        [
          {
            field: 'consentLineagePersonalisation',
            message: 'Consent is required to store tribe or lineage information.',
          },
        ],
      );
    }
  }

  private async issueSession(user: UserWithRelations, meta: RequestMeta): Promise<AuthSession> {
    const value = this.tokens.createRefreshTokenValue();
    const expiresAt = this.tokens.refreshTokenExpiry();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        tokenHash: this.tokens.hashToken(value),
        expiresAt,
        userAgent: this.userAgent(meta),
        ip: sanitiseIp(meta.ip),
      },
    });

    const accessToken = await this.tokens.signAccessToken({
      id: user.id,
      systemRole: user.systemRole,
      sessionVersion: user.sessionVersion,
    });

    return { accessToken, refreshToken: value, refreshExpiresAt: expiresAt, user: toUserMe(user) };
  }

  private async createAndSendVerificationEmail(user: {
    id: string;
    email: string;
    displayName: string;
  }): Promise<string> {
    const rawToken = generateOpaqueToken(32);
    await this.prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'VERIFY_EMAIL',
        tokenHash: sha256Hex(rawToken),
        expiresAt: new Date(Date.now() + VERIFY_EMAIL_TTL_MS),
      },
    });
    await this.email.sendVerificationEmail(
      { email: user.email, displayName: user.displayName },
      rawToken,
    );
    return rawToken;
  }

  private async getUserWithRelations(email: string): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({ where: { email }, include: USER_ME_INCLUDE });
    if (!user) throw AppException.notFound('Account');
    return user;
  }

  private userAgent(meta: RequestMeta): string | null {
    const value = meta.userAgent?.trim();
    return value ? value.slice(0, 255) : null;
  }

  private emailTaken(): AppException {
    return new AppException(
      ERROR_CODES.AUTH_EMAIL_TAKEN,
      409,
      'An account with this email address already exists. Try signing in instead.',
    );
  }

  private invalidCredentials(): AppException {
    return new AppException(
      ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      401,
      'The email or password is incorrect.',
    );
  }

  private sessionExpired(): AppException {
    return new AppException(
      ERROR_CODES.AUTH_TOKEN_EXPIRED,
      401,
      'Your session has expired. Please sign in again.',
    );
  }
}

// Keep the mapper type available for consumers that need the raw row shape.
export type { UserRow };
