import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODES, type SystemRole } from '@ubuntu-tales/shared';
import { AppException } from '../errors/app-exception';
import { hasRequiredRole } from './auth.logic';
import { ROLES_KEY } from './auth.decorators';
import type { RequestWithUser } from './jwt-auth.guard';

/**
 * Global role guard (production plan 05 §3.3). Runs after `JwtAuthGuard`; only enforces routes that
 * declare `@Roles(...)`, and always with the permission role — never `communityRole` (ADR-008).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<SystemRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user) {
      throw new AppException(ERROR_CODES.AUTH_INVALID_TOKEN, 401, 'Authentication is required.');
    }
    if (!hasRequiredRole(request.user.systemRole, required)) {
      throw new AppException(
        ERROR_CODES.FORBIDDEN,
        403,
        'You do not have permission to perform this action.',
      );
    }
    return true;
  }
}
