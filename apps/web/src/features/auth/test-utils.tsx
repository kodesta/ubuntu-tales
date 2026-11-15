import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { AuthResponse, UserMe } from '@ubuntu-tales/shared';
import type { ReactNode } from 'react';

import { setAccessToken } from '@/lib/session-token';
import { useSessionStore } from '@/stores/session';

/** Deterministic `UserMe` fixture for auth tests; override any field. */
export function makeUser(overrides: Partial<UserMe> = {}): UserMe {
  return {
    id: 'user-kwame',
    email: 'kwame@ubuntutales.local',
    emailVerified: true,
    displayName: 'Kwame Mensah',
    systemRole: 'READER',
    locale: 'en',
    onboarded: true,
    stats: {
      talesRead: 3,
      tribesExplored: 2,
      listeningMinutes: 0,
      currentStreakDays: 4,
    },
    createdAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

export function makeAuthResponse(overrides: Partial<AuthResponse> = {}): AuthResponse {
  return {
    accessToken: 'test-access-token',
    user: makeUser(),
    ...overrides,
  };
}

/** Puts the session store back to its cold-boot state between tests. */
export function resetSessionStore(): void {
  setAccessToken(null);
  useSessionStore.setState({
    user: null,
    status: 'unknown',
    accessToken: null,
    bootPromise: null,
  });
}

/** Logs a fixture user in without touching the network. */
export function seedAuthenticatedSession(user: UserMe = makeUser()): void {
  setAccessToken('test-access-token');
  useSessionStore.setState({
    user,
    status: 'authenticated',
    accessToken: 'test-access-token',
    bootPromise: Promise.resolve(),
  });
}

const EXTRA_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/profile',
  '/settings',
  '/saved',
  '/library',
  '/tribes',
  '/welcome',
  '/stories/$slug',
] as const;

/**
 * Renders UI inside a memory router that knows the app's public routes (so `<Link>`s resolve)
 * and a fresh QueryClient. The index route renders the component under test.
 */
export async function renderWithAuthRouter(
  ui: ReactNode,
  options: { initialEntries?: string[] } = {},
) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{ui}</>,
  });
  const extraRoutes = EXTRA_PATHS.map((path) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null }),
  );

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, ...extraRoutes]),
    history: createMemoryHistory({ initialEntries: options.initialEntries ?? ['/'] }),
    defaultPendingMinMs: 0,
  });
  await router.load();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return { ...result, router, queryClient };
}
