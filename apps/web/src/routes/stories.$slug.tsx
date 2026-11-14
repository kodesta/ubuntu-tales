import { createFileRoute, Outlet, useMatchRoute } from '@tanstack/react-router';

import { ReaderPage } from '@/features/reader/ReaderPage';

/**
 * `/stories/$slug` — the reader. The nested `/complete` route takes over the viewport entirely,
 * so when it is active we render only its outlet (no reader chrome behind the celebration).
 */
export const Route = createFileRoute('/stories/$slug')({
  component: StoryRoute,
});

function StoryRoute() {
  const matchRoute = useMatchRoute();
  const isComplete = matchRoute({ to: '/stories/$slug/complete' });
  const { slug } = Route.useParams();

  if (isComplete) return <Outlet />;

  return <ReaderPage slug={slug} />;
}
