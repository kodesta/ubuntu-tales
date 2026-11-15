import { createFileRoute } from '@tanstack/react-router';

import { MySubmissionsPage } from '@/features/submissions';

export const Route = createFileRoute('/me/submissions')({
  component: MySubmissionsPage,
});
