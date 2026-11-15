import { createFileRoute } from '@tanstack/react-router';

import { LegalPage } from '@/features/legal/LegalPage';

export const Route = createFileRoute('/legal/$slug')({
  component: LegalRoute,
});

function LegalRoute() {
  const { slug } = Route.useParams();
  return <LegalPage slug={slug} />;
}
