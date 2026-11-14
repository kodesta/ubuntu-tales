import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { queryClient } from '@/lib/query-client';
import { useSessionStore } from '@/stores/session';

import { router } from './router';

/**
 * App providers: TanStack Query for server state, TanStack Router for navigation.
 * Toasts and the route error boundary live in the root route so they inherit the router context.
 */
export function AppProviders() {
  useEffect(() => {
    void useSessionStore.getState().boot();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
