import { createFileRoute } from '@tanstack/react-router';

import { AdminModeration } from '@/features/admin';

export const Route = createFileRoute('/admin/moderation')({
  component: AdminModeration,
});
