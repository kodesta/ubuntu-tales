import type { SystemRole } from '@ubuntu-tales/shared';

/** Permission roles in hierarchy order (READER < CONTRIBUTOR < EDITOR < ADMIN, plan 05 §3.3). */
export const SYSTEM_ROLES: readonly SystemRole[] = ['READER', 'CONTRIBUTOR', 'EDITOR', 'ADMIN'];

export type UserStatusValue = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

/** Claims carried by the short-lived access JWT (plan 05 §3.2). */
export interface AccessTokenPayload {
  /** User id. */
  sub: string;
  /** `User.sessionVersion` at signing time; a mismatch invalidates the token. */
  sv: number;
  /** `User.systemRole`. */
  role: SystemRole;
  iat?: number;
  exp?: number;
}

/** The authenticated principal attached to the request by `JwtAuthGuard`. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  status: UserStatusValue;
  sessionVersion: number;
  emailVerified: boolean;
  tribeId: string | null;
}

/** Metadata captured from the request for refresh-token auditing. */
export interface RequestMeta {
  userAgent?: string;
  ip?: string;
}
