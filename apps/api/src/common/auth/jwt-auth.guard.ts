import { Injectable, Logger, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '@ubuntu-tales/shared';
import type { FastifyRequest } from 'fastify';
import { AppException } from '../errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  extractBearerToken,
  isAccessTokenPayload,
  isSessionCurrent,
  isTokenExpiredError,
} from './auth.logic';
import { IS_OPTIONAL_AUTH_KEY, IS_PUBLIC_KEY } from './auth.decorators';
import type { AuthenticatedUser } from './auth.types';

/** Fastify request with the resolved principal attached by the guard. */
export interface RequestWithUser extends FastifyRequest {
  user?: AuthenticatedUser;
}

type ResolveResult =
  | { status: 'ok'; user: AuthenticatedUser }
  | { status: 'invalid' }
  | { status: 'expired' };

/**
 * Global authentication guard (production plan 05 §3.3): every route is protected unless it is
 * `@Public()`. Resolves the bearer access token, validates the JWT signature/claims, then loads the
 * user so status (`ACTIVE`) and `sessionVersion` are checked on every request — suspension and
 * sign-out-everywhere take effect immediately rather than after the 15-minute access-token TTL.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    if (isPublic) return true;

    const optional = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, targets) ?? false;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      if (optional) return true;
      throw new AppException(
        ERROR_CODES.AUTH_INVALID_TOKEN,
        401,
        'Authentication is required. Send an Authorization: Bearer <accessToken> header.',
      );
    }

    const result = await this.resolveUser(token);
    if (result.status === 'ok') {
      request.user = result.user;
      return true;
    }

    // A stale token in a browser must never break public browsing: optional routes fall back to a
    // guest response (the web session store refreshes on boot and on any protected 401).
    if (optional) return true;

    if (result.status === 'expired') {
      throw new AppException(
        ERROR_CODES.AUTH_TOKEN_EXPIRED,
        401,
        'The access token has expired. Refresh the session and retry.',
      );
    }
    throw new AppException(
      ERROR_CODES.AUTH_INVALID_TOKEN,
      401,
      'The access token is invalid. Please sign in again.',
    );
  }

  private async resolveUser(token: string): Promise<ResolveResult> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });
    } catch (error) {
      if (isTokenExpiredError(error)) return { status: 'expired' };
      this.logger.debug(
        `Rejected access token: ${error instanceof Error ? error.message : 'invalid signature'}`,
      );
      return { status: 'invalid' };
    }

    if (!isAccessTokenPayload(payload)) return { status: 'invalid' };

    const row = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        displayName: true,
        systemRole: true,
        status: true,
        sessionVersion: true,
        emailVerifiedAt: true,
        tribeId: true,
      },
    });

    if (!row || !isSessionCurrent(row, payload)) {
      throw new AppException(
        ERROR_CODES.AUTH_INVALID_TOKEN,
        401,
        'Your session is no longer valid. Please sign in again.',
      );
    }

    return {
      status: 'ok',
      user: {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        systemRole: row.systemRole,
        status: row.status,
        sessionVersion: row.sessionVersion,
        emailVerified: row.emailVerifiedAt !== null,
        tribeId: row.tribeId,
      },
    };
  }
}
