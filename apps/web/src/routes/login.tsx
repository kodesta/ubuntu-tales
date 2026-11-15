import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { sanitizeRedirect } from '@/features/auth/validation';
import { useSessionStore } from '@/stores/session';

/** `?redirect=` is normalised again before use; the raw value only steers this screen. */
const loginSearchSchema = z.object({
  redirect: z.coerce.string().optional().catch(undefined),
});

export type LoginSearch = z.infer<typeof loginSearchSchema>;

/** `/login` — editorial sign-in; already-authenticated readers are sent on their way. */
export const Route = createFileRoute('/login')({
  validateSearch: (search) => loginSearchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    await useSessionStore.getState().boot();
    if (useSessionStore.getState().status === 'authenticated') {
      throw redirect({ href: sanitizeRedirect(search.redirect) ?? '/', replace: true });
    }
  },
  component: LoginPage,
});
