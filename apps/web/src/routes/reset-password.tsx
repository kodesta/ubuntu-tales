import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

const resetPasswordSearchSchema = z.object({
  token: z.coerce.string().optional(),
});

export type ResetPasswordSearch = z.infer<typeof resetPasswordSearchSchema>;

/** `/reset-password?token=` — choose a new password from the emailed link. */
export const Route = createFileRoute('/reset-password')({
  validateSearch: (search) => resetPasswordSearchSchema.parse(search),
  component: ResetPasswordPage,
});
