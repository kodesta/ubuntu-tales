import { createFileRoute } from '@tanstack/react-router';

import { ExplorePage } from '@/features/explore/ExplorePage';

export const Route = createFileRoute('/explore')({
  component: ExplorePage,
});
