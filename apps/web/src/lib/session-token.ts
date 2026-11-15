/**
 * In-memory access token + single-flight refresh bridge between the API client and the session
 * store. ADR-007: the access token is never persisted; the refresh token is an httpOnly cookie.
 */

let accessToken: string | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  refreshHandler = handler;
}

/** Called by the API client on a 401; the session store guarantees a single in-flight refresh. */
export function refreshAccessToken(): Promise<string | null> {
  return refreshHandler ? refreshHandler() : Promise.resolve(null);
}
