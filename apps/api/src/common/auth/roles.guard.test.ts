import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ERROR_CODES, type SystemRole } from '@ubuntu-tales/shared';
import { AppException } from '../errors/app-exception';
import { Roles } from './auth.decorators';
import { RolesGuard } from './roles.guard';

class AdminController {
  @Roles('ADMIN')
  handler(): void {}
}

class EditorController {
  @Roles('EDITOR')
  handler(): void {}
}

class OpenController {
  handler(): void {}
}

function contextFor(handler: () => void, controller: new () => unknown, user?: unknown) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function actor(systemRole: SystemRole) {
  return { id: 'user-1', systemRole };
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows routes without @Roles metadata', () => {
    expect(
      guard.canActivate(
        contextFor(OpenController.prototype.handler, OpenController, actor('READER')),
      ),
    ).toBe(true);
  });

  it('allows ADMINS on EDITOR routes and on their own routes', () => {
    expect(
      guard.canActivate(
        contextFor(EditorController.prototype.handler, EditorController, actor('ADMIN')),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor(AdminController.prototype.handler, AdminController, actor('ADMIN')),
      ),
    ).toBe(true);
  });

  it('denies lower roles with FORBIDDEN/403', () => {
    try {
      guard.canActivate(
        contextFor(EditorController.prototype.handler, EditorController, actor('CONTRIBUTOR')),
      );
      throw new Error('expected a denial');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe(ERROR_CODES.FORBIDDEN);
      expect((error as AppException).getStatus()).toBe(403);
    }
  });

  it('denies guests with a 401 before the role check', () => {
    try {
      guard.canActivate(contextFor(AdminController.prototype.handler, AdminController, undefined));
      throw new Error('expected a denial');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).getStatus()).toBe(401);
    }
  });
});
