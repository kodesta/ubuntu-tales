import { createFileRoute } from '@tanstack/react-router';

import { CompletePage } from '@/features/celebration/CompletePage';

/** `/stories/$slug/complete` — the end-of-tale celebration. */
export const Route = createFileRoute('/stories/$slug/complete')({
  component: CompleteRoute,
});

function CompleteRoute() {
  const { slug } = Route.useParams();
  return <CompletePage slug={slug} />;
}
