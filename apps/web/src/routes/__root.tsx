import type { QueryClient } from '@tanstack/react-query';
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
  type ErrorComponentProps,
} from '@tanstack/react-router';

import { NotFoundPage } from '@/app/not-found';
import { RouteErrorPage } from '@/app/error-page';
import { AuthModalHost, EmailVerificationBanner } from '@/features/auth';
import { OfflineBanner } from '@/features/offline';
import { MiniPlayer } from '@/features/player';
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
  // The mini player belongs to the reading shell; the full player and completion own the screen.
  const showMiniPlayer =
    !minimalChrome && !pathname.endsWith('/listen') && !pathname.endsWith('/complete');

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <OfflineBanner />
      {minimalChrome ? null : (
        <Header
          onOpenMenu={() => setDrawerOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
        />
      )}
      {minimalChrome ? null : <EmailVerificationBanner />}
      <Outlet />
      {minimalChrome ? null : <Footer />}
      {minimalChrome ? null : <BottomNav />}
      {showMiniPlayer ? <MiniPlayer /> : null}
      <NavDrawer />
      <SearchOverlay />
      <AuthModalHost />
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
