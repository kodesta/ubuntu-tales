import { createFileRoute } from '@tanstack/react-router';

import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';

/** `/forgot-password` — request a reset letter; always answers calmly. */
export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
});
