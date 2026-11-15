import { Injectable } from '@nestjs/common';
import type { UserMe } from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AuthService, CONSENT_VERSION } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import type { RequestMeta } from '../../common/auth/auth.types';
import type { AuthSession } from '../auth/auth.service';
import type { ChangePasswordDto, UpdateMeDto } from './users.dto';

/** `/me` profile operations (production plan 03 §2.3). */
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly passwords: PasswordService,
  ) {}

  async getMe(userId: string): Promise<UserMe> {
    return this.auth.getUserMe(userId);
  }

  /**
   * Rectification endpoint: name, optional roots (tribe *or* custom lineage), community role and
   * locale. Choosing a tribe clears a custom lineage and vice versa; roots stay optional and
   * editable/removable at any time (plan 08 §3).
   */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserMe> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tribeId: true,
        customLineage: true,
        lineageLabel: true,
      },
    });
    if (!existing) throw AppException.notFound('Account');

    const hasTribe = dto.tribeId !== undefined;
    const hasCustomLineage = dto.customLineage !== undefined;
    const tribeProvided = typeof dto.tribeId === 'string' && dto.tribeId.length > 0;
    const customProvided =
      typeof dto.customLineage === 'string' && dto.customLineage.trim().length > 0;

    if (tribeProvided && customProvided) {
      throw AppException.validation('Choose either a tribe or a custom lineage, not both.', [
        { field: 'tribeId', message: 'Choose either a tribe or a custom lineage, not both.' },
        { field: 'customLineage', message: 'Choose either a tribe or a custom lineage, not both.' },
      ]);
    }

    if (tribeProvided) {
      const tribe = await this.prisma.tribe.findFirst({
        where: { id: dto.tribeId as string, isActive: true },
        select: { id: true },
      });
      if (!tribe) {
        throw AppException.validation('Choose a valid tribe.', [
          { field: 'tribeId', message: 'That tribe does not exist.' },
        ]);
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.displayName !== undefined) data.displayName = dto.displayName.trim();
    if (dto.communityRole !== undefined) data.communityRole = dto.communityRole;
    if (dto.locale !== undefined) data.locale = dto.locale;

    if (tribeProvided) {
      data.tribeId = dto.tribeId;
      data.customLineage = null;
    } else if (hasTribe && dto.tribeId === null) {
      data.tribeId = null;
    }

    if (customProvided) {
      const lineage = (dto.customLineage as string).trim();
      data.customLineage = lineage;
      data.tribeId = null;
      data.lineageLabel = dto.lineageLabel ?? lineage;
    } else if (hasCustomLineage && dto.customLineage === null) {
      data.customLineage = null;
    }

    if (dto.lineageLabel !== undefined) {
      data.lineageLabel =
        typeof dto.lineageLabel === 'string' && dto.lineageLabel.trim().length > 0
          ? dto.lineageLabel.trim()
          : null;
    }

    const nextLineage =
      (data.customLineage as string | null | undefined) !== undefined
        ? (data.customLineage as string | null)
        : existing.customLineage;
    const nextTribe =
      (data.tribeId as string | null | undefined) !== undefined
        ? (data.tribeId as string | null)
        : existing.tribeId;

    if (nextTribe && nextLineage) {
      throw AppException.validation('Choose either a tribe or a custom lineage, not both.', [
        { field: 'tribeId', message: 'Choose either a tribe or a custom lineage, not both.' },
      ]);
    }

    // Roots are sensitive data: recording/updating them implies the personalisation consent the
    // user gave at signup. Backfill the consent row for accounts created before it existed.
    if (nextTribe || nextLineage || data.lineageLabel) {
      const consent = await this.prisma.userConsent.findFirst({
        where: { userId, type: 'lineage_personalisation' },
        select: { id: true },
      });
      if (!consent) {
        await this.prisma.userConsent.create({
          data: {
            userId,
            type: 'lineage_personalisation',
            version: CONSENT_VERSION,
            granted: true,
          },
        });
      }
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data });
    }
    return this.auth.getUserMe(userId);
  }

  /** Marks onboarding complete (the respondent chose roots or explicitly skipped). */
  async completeOnboarding(userId: string): Promise<UserMe> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, onboardedAt: true },
    });
    if (!user) throw AppException.notFound('Account');
    if (user.onboardedAt === null) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { onboardedAt: new Date() },
      });
    }
    return this.auth.getUserMe(userId);
  }

  /**
   * Changes the password. Bumps `sessionVersion` (invalidating every issued access JWT) and revokes
   * every refresh token, i.e. all other devices are signed out (plan 03 §2.3, 08 §1). Because the
   * refresh cookie is scoped to `/api/v1/auth` it cannot be read here, so the caller receives a
   * brand-new session for this device; the controller sets the rotated cookie.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    meta: RequestMeta = {},
  ): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw AppException.notFound('Account');
    if (!user.passwordHash) {
      throw AppException.validation('This account has no password set yet.', [
        { field: 'currentPassword', message: 'This account has no password set yet.' },
      ]);
    }

    const currentOk = await this.passwords.verify(user.passwordHash, dto.currentPassword);
    if (!currentOk) {
      throw AppException.validation('Your current password is incorrect.', [
        { field: 'currentPassword', message: 'Your current password is incorrect.' },
      ]);
    }

    await this.passwords.assertAcceptable(dto.newPassword, 'newPassword');
    const passwordHash = await this.passwords.hash(dto.newPassword);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);

    return this.auth.createSessionForUser(userId, meta);
  }
}
