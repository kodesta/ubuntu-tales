import { createApiClient } from '@ubuntu-tales/api-client';

import { getAccessToken, refreshAccessToken } from './session-token';

/**
 * The one HTTP client for the web app. Everything goes through here (or the TanStack Query hooks in
 * `lib/queries.ts`); no component writes its own `fetch`.
 *
 * The access token lives in memory (ADR-007) and the refresh cookie is sent automatically
 * (`credentials: include` inside the client). A 401 triggers the session store's single-flight
 * refresh and a one-time retry.
 */
export const api = createApiClient({
  baseUrl: '/api/v1',
  getAccessToken,
  onUnauthorized: refreshAccessToken,
});

export { ApiError } from '@ubuntu-tales/api-client';
export type { ApiClient } from '@ubuntu-tales/api-client';
