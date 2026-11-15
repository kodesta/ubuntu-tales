import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router';

import { ReaderPage } from '@/features/reader/ReaderPage';

/**
 * `/stories/$slug` — the reader. The nested `/listen` and `/complete` routes take over the viewport
 * entirely, so when either is active we render only its outlet (no reader chrome behind them).
 */
export const Route = createFileRoute('/stories/$slug')({
  component: StoryRoute,
});

function StoryRoute() {
  const matchRoute = useMatchRoute();
  const isComplete = matchRoute({ to: '/stories/$slug/complete' });
  const isListen = matchRoute({ to: '/stories/$slug/listen' });
  const { slug } = Route.useParams();

  if (isComplete || isListen) return <Outlet />;

  return <ReaderPage slug={slug} />;
}
