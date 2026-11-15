import { createFileRoute } from '@tanstack/react-router';

import { AdminStories } from '@/features/admin';

export const Route = createFileRoute('/admin/stories')({
  component: AdminStories,
});
