import { describe, expect, it } from 'vitest';
import {
  REFRESH_COOKIE_NAME,
  REFRESH_COOKIE_PATH,
  buildClearRefreshCookieOptions,
  buildRefreshCookieOptions,
} from './cookies';

describe('refresh cookie attributes', () => {
  it('matches the hardening contract: httpOnly, SameSite=Lax, scoped to /api/v1/auth', () => {
    const options = buildRefreshCookieOptions({ secure: true, maxAgeSeconds: 30 * 24 * 60 * 60 });
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: REFRESH_COOKIE_PATH,
      maxAge: 30 * 24 * 60 * 60,
    });
    expect(REFRESH_COOKIE_NAME).toBe('refresh_token');
    expect(REFRESH_COOKIE_PATH).toBe('/api/v1/auth');
  });

  it('disables Secure for local http development but keeps the other attributes', () => {
    const options = buildRefreshCookieOptions({ secure: false, maxAgeSeconds: 60 });
    expect(options.secure).toBe(false);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('lax');
  });

  it('clears with the same path so browsers remove the cookie', () => {
    const options = buildClearRefreshCookieOptions({ secure: false });
    expect(options).toMatchObject({ path: REFRESH_COOKIE_PATH, httpOnly: true, sameSite: 'lax' });
    expect(options.maxAge).toBeUndefined();
  });
});
