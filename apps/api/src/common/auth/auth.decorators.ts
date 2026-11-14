import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SystemRole } from '@ubuntu-tales/shared';
import type { AuthenticatedUser } from './auth.types';

export const IS_PUBLIC_KEY = 'auth:public';
export const IS_OPTIONAL_AUTH_KEY = 'auth:optional';
export const ROLES_KEY = 'auth:roles';

/**
 * Marks a route (or controller) as fully public: no bearer token is read and guests are allowed.
 * The global `JwtAuthGuard` protects everything else.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Marks a route as *optionally* authenticated: guests are allowed, but a valid bearer token is
 * resolved and attached to the request so responses can be personalised (`StoryCard.viewer`,
 * `/home` tribe, reaction `viewer`, etc.). An invalid/expired token is treated as a guest here so a
 * stale browser token can never break public browsing.
 */
export const OptionalAuth = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_OPTIONAL_AUTH_KEY, true);

/** Requires one of the given permission roles (hierarchy READER < CONTRIBUTOR < EDITOR < ADMIN). */
export const Roles = (...roles: SystemRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

/** Injects the authenticated user (or `undefined` on `@OptionalAuth()` routes for guests). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>().user,
);
