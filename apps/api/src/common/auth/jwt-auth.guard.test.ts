import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { ERROR_CODES } from '@ubuntu-tales/shared';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import { AppException } from '../errors/app-exception';
import { OptionalAuth, Public } from './auth.decorators';
import { JwtAuthGuard } from './jwt-auth.guard';

/** Dummy controllers so the real Reflector sees the decorator metadata. */
class ProtectedController {
  handler(): void {}
}
class PublicController {
  @Public()
  handler(): void {}
}
class OptionalController {
  @OptionalAuth()
  handler(): void {}
}

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: unknown;
}

function makeContext(handler: () => void, controller: new () => unknown, request: MockRequest) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const USER_ROW = {
  id: '0190a0b0-0000-7000-8000-000000000001',
  email: 'kwame@ubuntutales.local',
  displayName: 'Kwame Mensah',
  systemRole: 'READER',
  status: 'ACTIVE',
  sessionVersion: 3,
  emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
  tribeId: null,
};

function makeGuard(options: {
  verify?: () => Promise<unknown>;
  user?: unknown;
}): JwtAuthGuard {
  const jwt = { verifyAsync: vi.fn(options.verify ?? (() => Promise.resolve({}))) } as unknown as JwtService;
  const prisma = {
    user: { findUnique: vi.fn(() => Promise.resolve(options.user ?? USER_ROW)) },
  } as unknown as PrismaService;
  const config = {
    getOrThrow: () => 'test-secret-that-is-long-enough-0123456789',
    get: () => undefined,
  } as unknown as ConfigService;
  return new JwtAuthGuard(new Reflector(), jwt, prisma, config);
}

async function expectAppException(promise: Promise<unknown>, code: string, status: number) {
  try {
    await promise;
    throw new Error('Expected an AppException to be thrown.');
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    const exception = error as AppException;
    expect(exception.code).toBe(code);
    expect(exception.getStatus()).toBe(status);
  }
}

describe('JwtAuthGuard', () => {
  it('allows @Public() routes without a token', async () => {
    const guard = makeGuard({});
    const request: MockRequest = { headers: {} };
    await expect(
      guard.canActivate(makeContext(PublicController.prototype.handler, PublicController, request)),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('rejects protected routes without a token', async () => {
    const guard = makeGuard({});
    await expectAppException(
      guard.canActivate(
        makeContext(ProtectedController.prototype.handler, ProtectedController, { headers: {} }),
      ),
      ERROR_CODES.AUTH_INVALID_TOKEN,
      401,
    );
  });

  it('treats a missing token as a guest on @OptionalAuth() routes', async () => {
    const guard = makeGuard({});
    const request: MockRequest = { headers: {} };
    await expect(
      guard.canActivate(makeContext(OptionalController.prototype.handler, OptionalController, request)),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('attaches the authenticated user for a valid token', async () => {
    const guard = makeGuard({
      verify: () =>
        Promise.resolve({
          sub: USER_ROW.id,
          sv: USER_ROW.sessionVersion,
          role: 'READER',
        }),
    });
    const request: MockRequest = { headers: { authorization: 'Bearer good.token.here' } };
    await expect(
      guard.canActivate(
        makeContext(ProtectedController.prototype.handler, ProtectedController, request),
      ),
    ).resolves.toBe(true);
    expect(request.user).toMatchObject({
      id: USER_ROW.id,
      email: USER_ROW.email,
      systemRole: 'READER',
      sessionVersion: 3,
      emailVerified: true,
    });
  });

  it('rejects an expired access token with AUTH_TOKEN_EXPIRED', async () => {
    const guard = makeGuard({
      verify: () => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        return Promise.reject(error);
      },
    });
    await expectAppException(
      guard.canActivate(
        makeContext(ProtectedController.prototype.handler, ProtectedController, {
          headers: { authorization: 'Bearer expired.token.here' },
        }),
      ),
      ERROR_CODES.AUTH_TOKEN_EXPIRED,
      401,
    );
  });

  it('treats an expired token as a guest on optional routes (browse must not break)', async () => {
    const guard = makeGuard({
      verify: () => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        return Promise.reject(error);
      },
    });
    const request: MockRequest = { headers: { authorization: 'Bearer expired.token.here' } };
    await expect(
      guard.canActivate(makeContext(OptionalController.prototype.handler, OptionalController, request)),
    ).resolves.toBe(true);
    expect(request.user).toBeUndefined();
  });

  it('rejects a token whose session version no longer matches (sign-out-everywhere)', async () => {
    const guard = makeGuard({
      verify: () => Promise.resolve({ sub: USER_ROW.id, sv: 1, role: 'READER' }),
    });
    await expectAppException(
      guard.canActivate(
        makeContext(ProtectedController.prototype.handler, ProtectedController, {
          headers: { authorization: 'Bearer rotated.token.here' },
        }),
      ),
      ERROR_CODES.AUTH_INVALID_TOKEN,
      401,
    );
  });

  it('rejects a suspended account even with a structurally valid token', async () => {
    const guard = makeGuard({
      verify: () => Promise.resolve({ sub: USER_ROW.id, sv: USER_ROW.sessionVersion, role: 'READER' }),
      user: { ...USER_ROW, status: 'SUSPENDED' },
    });
    await expectAppException(
      guard.canActivate(
        makeContext(ProtectedController.prototype.handler, ProtectedController, {
          headers: { authorization: 'Bearer suspended.token.here' },
        }),
      ),
      ERROR_CODES.AUTH_INVALID_TOKEN,
      401,
    );
  });

  it('rejects malformed payloads and invalid signatures', async () => {
    const guard = makeGuard({
      verify: () => Promise.resolve({ sub: USER_ROW.id }),
    });
    await expectAppException(
      guard.canActivate(
        makeContext(ProtectedController.prototype.handler, ProtectedController, {
          headers: { authorization: 'Bearer malformed.token.here' },
        }),
      ),
      ERROR_CODES.AUTH_INVALID_TOKEN,
      401,
    );
  });
});
