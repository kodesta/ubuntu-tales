import type { SystemRole } from '@ubuntu-tales/shared';
import { SYSTEM_ROLES, type AccessTokenPayload, type UserStatusValue } from './auth.types';

/** `READER` = 1 … `ADMIN` = 4. Unknown roles are treated as unauthenticated (0). */
export function roleRank(role: SystemRole | string | null | undefined): number {
  if (typeof role !== 'string') return 0;
  const index = SYSTEM_ROLES.indexOf(role as SystemRole);
  return index < 0 ? 0 : index + 1;
}

/** True when the user's role is at least one of the required roles (hierarchy, not equality). */
export function hasRequiredRole(
  userRole: SystemRole | string | null | undefined,
  required: readonly SystemRole[],
): boolean {
  if (required.length === 0) return true;
  const user = roleRank(userRole);
  if (user === 0) return false;
  return required.some((role) => user >= roleRank(role));
}

/** Extracts a bearer token from an `Authorization` header without trusting its format. */
export function extractBearerToken(header: string | string[] | undefined): string | null {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') return null;
  const match = /^Bearer\s+([A-Za-z0-9._~+/-]+=*)$/i.exec(value.trim());
  return match?.[1] ?? null;
}

/** Structural validation of the JWT payload before it is trusted. */
export function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === 'string' &&
    payload.sub.length > 0 &&
    payload.sub.length <= 64 &&
    typeof payload.sv === 'number' &&
    Number.isInteger(payload.sv) &&
    payload.sv >= 0 &&
    typeof payload.role === 'string' &&
    SYSTEM_ROLES.includes(payload.role as SystemRole)
  );
}

/**
 * A token is only valid while the account is ACTIVE and its `sv` claim matches the user's current
 * `sessionVersion` (password change / sign-out-everywhere bump it, plan 05 §3.2).
 */
export function isSessionCurrent(
  user: { sessionVersion: number; status: UserStatusValue | string },
  payload: { sv: number },
): boolean {
  return user.status === 'ACTIVE' && user.sessionVersion === payload.sv;
}

/** jsonwebtoken signals expiry through `TokenExpiredError.name`; we do not import its types. */
export function isTokenExpiredError(error: unknown): boolean {
  return error instanceof Error && error.name === 'TokenExpiredError';
}
