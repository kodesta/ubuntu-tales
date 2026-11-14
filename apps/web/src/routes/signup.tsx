import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { SignupPage } from '@/features/auth/pages/SignupPage';
import { sanitizeRedirect } from '@/features/auth/validation';
import { useSessionStore } from '@/stores/session';

const signupSearchSchema = z.object({
  redirect: z.coerce.string().optional().catch(undefined),
});

export type SignupSearch = z.infer<typeof signupSearchSchema>;

/** `/signup` — open an account. Roots/lineage stay optional (docs 08 §3). */
export const Route = createFileRoute('/signup')({
  validateSearch: (search) => signupSearchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    await useSessionStore.getState().boot();
    if (useSessionStore.getState().status === 'authenticated') {
      throw redirect({ href: sanitizeRedirect(search.redirect) ?? '/', replace: true });
    }
  },
  component: SignupPage,
});
