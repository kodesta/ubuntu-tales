import { createFileRoute } from '@tanstack/react-router';

import { AdminStoryOfDay } from '@/features/admin';

export const Route = createFileRoute('/admin/story-of-the-day')({
  component: AdminStoryOfDay,
});
