import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';

interface RenderWithRouterOptions {
  initialEntries?: string[];
}

/**
 * Renders arbitrary UI inside a minimal memory router that knows the app's public paths, so
 * `<Link>` components get a real router context without booting the whole app.
 */
export async function renderWithRouter(
  ui: ReactNode,
  options: RenderWithRouterOptions = {},
) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <>{ui}</>,
  });
  const storyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stories/$slug',
    component: () => null,
  });
  const tribeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/tribes/$slug',
    component: () => null,
  });
  const libraryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/library',
    component: () => null,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, storyRoute, tribeRoute, libraryRoute]),
    history: createMemoryHistory({
      initialEntries: options.initialEntries ?? ['/'],
    }),
    defaultPendingMinMs: 0,
  });

  await router.load();
  return render(<RouterProvider router={router} />);
}
