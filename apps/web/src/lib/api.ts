import { createApiClient } from '@ubuntu-tales/api-client';

/**
 * The one HTTP client for the web app. Everything goes through here (or the TanStack Query hooks in
 * `lib/queries.ts`); no component writes its own `fetch`.
 */
export const api = createApiClient({ baseUrl: '/api/v1' });

export { ApiError } from '@ubuntu-tales/api-client';
export type { ApiClient } from '@ubuntu-tales/api-client';
