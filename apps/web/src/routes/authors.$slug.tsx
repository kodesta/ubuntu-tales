import { createFileRoute } from '@tanstack/react-router';

import { AuthorPage } from '@/features/authors/AuthorPage';

/** `/authors/$slug` — griot profile. */
export const Route = createFileRoute('/authors/$slug')({
  component: AuthorRoute,
});

function AuthorRoute() {
  const { slug } = Route.useParams();
  return <AuthorPage slug={slug} />;
}
