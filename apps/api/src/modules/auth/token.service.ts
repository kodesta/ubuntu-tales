import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { SystemRole } from '@ubuntu-tales/shared';
import {
  DAY_MS,
  expiryFromNow,
  generateOpaqueToken,
  sha256Hex,
} from './token.util';

/**
 * Signs the short-lived access JWT and mints/hashes opaque refresh tokens.
 *
 * Plan 05 §3.2 prescribes EdDSA for production; the Phase 2 slice signs HS256 with `JWT_SECRET`
 * (the env contract the Lead provisioned) so no key-management pipeline is needed yet.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  get refreshTtlDays(): number {
    return this.config.get<number>('REFRESH_TOKEN_TTL_DAYS') ?? 30;
  }

  get refreshTtlSeconds(): number {
    return this.refreshTtlDays * 24 * 60 * 60;
  }

  async signAccessToken(user: {
    id: string;
    systemRole: SystemRole;
    sessionVersion: number;
  }): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, sv: user.sessionVersion, role: user.systemRole },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        algorithm: 'HS256',
        expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as JwtSignOptions['expiresIn'],
      },
    );
  }

  /** Fresh opaque refresh token (256 bits) — only the sha256 hash is persisted. */
  createRefreshTokenValue(): string {
    return generateOpaqueToken(32);
  }

  hashToken(token: string): string {
    return sha256Hex(token);
  }

  refreshTokenExpiry(now: Date = new Date()): Date {
    return expiryFromNow(this.refreshTtlDays * DAY_MS, now);
  }

  emailTokenExpiry(ttlMs: number, now: Date = new Date()): Date {
    return expiryFromNow(ttlMs, now);
  }
}
