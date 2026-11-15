import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';

/** The refresh cookie is scoped to the auth endpoints that read it (plan 05 §3.2). */
export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

/**
 * CSRF mitigation for the cookie-based refresh endpoint: the SPA must send this header, which a
 * cross-site form post cannot do (plan 08 §2).
 */
export const REFRESH_HEADER_NAME = 'x-requested-with';
export const REFRESH_HEADER_VALUE = 'ubuntu-tales';

export interface RefreshCookieConfig {
  secure: boolean;
  /** Lifetime in seconds (REFRESH_TOKEN_TTL_DAYS × 24 h). */
  maxAgeSeconds: number;
}

/** Cookie attributes from plan 05 §3.2: HttpOnly, SameSite=Lax, Path=/api/v1/auth, Secure per env. */
export function buildRefreshCookieOptions(config: RefreshCookieConfig): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secure,
    path: REFRESH_COOKIE_PATH,
    maxAge: config.maxAgeSeconds,
  };
}

/** Writes the rotating refresh cookie on a response (login, register, refresh, password change). */
export function writeRefreshCookie(
  reply: FastifyReply,
  token: string,
  config: RefreshCookieConfig,
): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, buildRefreshCookieOptions(config));
}

/** Clear-cookie options must match path/attributes for browsers to drop the cookie. */
export function buildClearRefreshCookieOptions(config: {
  secure: boolean;
}): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secure,
    path: REFRESH_COOKIE_PATH,
  };
}

/** Reads the refresh cookie from a Fastify request (the cookie plugin augments `request.cookies`). */
export function readRefreshCookie(request: FastifyRequest): string | null {
  const cookies = (request as FastifyRequest & { cookies?: Record<string, string | undefined> })
    .cookies;
  return cookies?.[REFRESH_COOKIE_NAME] ?? null;
}
