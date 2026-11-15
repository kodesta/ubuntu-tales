import { createFileRoute } from '@tanstack/react-router';

import { SubmitPage } from '@/features/submissions';

export const Route = createFileRoute('/submit')({
  component: SubmitPage,
});
