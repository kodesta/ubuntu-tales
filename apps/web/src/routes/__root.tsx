import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
  type ErrorComponentProps,
} from '@tanstack/react-router';

import { NotFoundPage } from '@/app/not-found';
import { RouteErrorPage } from '@/app/error-page';
import { NavDrawer } from '@/features/shell/NavDrawer';
import { SearchOverlay } from '@/features/search/SearchOverlay';
import { useUiStore } from '@/stores/ui';
import { BottomNav, Footer, Header, Toaster } from '@/ui';

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
  errorComponent: RootError,
});

/**
 * App shell: skip link, sticky header, routed page, footer, mobile bottom nav, navigation drawer,
 * global search overlay, toaster, scroll restoration.
 *
 * The reader (`/stories/*`) and welcome (`/welcome`) routes own the viewport, so global chrome is
 * hidden there (design doc §6, §7.5).
 */
function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const setDrawerOpen = useUiStore((state) => state.setDrawerOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const minimalChrome = pathname === '/welcome' || pathname.startsWith('/stories/');

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {minimalChrome ? null : (
        <Header
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}
      <Outlet />
      {minimalChrome ? null : <Footer />}
      {minimalChrome ? null : <BottomNav />}
      <NavDrawer />
      <SearchOverlay />
      <Toaster />
    </>
  );
}

function RootError({ error, reset }: ErrorComponentProps) {
  const normalised = error instanceof Error ? error : new Error(String(error));
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <RouteErrorPage error={normalised} reset={reset} />
    </>
  );
}
