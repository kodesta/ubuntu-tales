import { createFileRoute } from '@tanstack/react-router';

import { PublicationPage } from '@/features/tribes/PublicationPage';
import { tribeQueryOptions } from '@/lib/queries';

export const Route = createFileRoute('/tribes/$slug')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(tribeQueryOptions(params.slug));
  },
  component: PublicationRoute,
});

function PublicationRoute() {
  const { slug } = Route.useParams();
  return <PublicationPage slug={slug} />;
}
