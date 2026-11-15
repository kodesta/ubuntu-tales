import { QueryClient } from '@tanstack/react-query';

/**
 * Catalogue data changes slowly in Phase 1, so queries are calm: 60 s stale, one retry only.
 * `me/*` style queries do not exist yet (no accounts); when they land they should override staleTime.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});
