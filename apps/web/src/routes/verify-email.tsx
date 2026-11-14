import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { VerifyEmailPage } from '@/features/auth/pages/VerifyEmailPage';

const verifyEmailSearchSchema = z.object({
  token: z.coerce.string().optional(),
  /** `?sent=1` after signup — shows the "check your inbox" state without consuming a token. */
  sent: z.unknown().optional(),
});

export type VerifyEmailSearch = z.infer<typeof verifyEmailSearchSchema>;

/** `/verify-email?token=` — consumes the single-use email verification token. */
export const Route = createFileRoute('/verify-email')({
  validateSearch: (search) => verifyEmailSearchSchema.parse(search),
  component: VerifyEmailPage,
});
