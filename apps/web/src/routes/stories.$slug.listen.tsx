import { createFileRoute } from '@tanstack/react-router';

import { ListenPage } from '@/features/player';

export const Route = createFileRoute('/stories/$slug/listen')({
  component: ListenRoute,
});

function ListenRoute() {
  const { slug } = Route.useParams();
  return <ListenPage slug={slug} />;
}
