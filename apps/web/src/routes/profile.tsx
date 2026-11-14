import { createFileRoute, redirect } from '@tanstack/react-router';

import { ProfilePage } from '@/features/profile/ProfilePage';
import { useSessionStore } from '@/stores/session';

/** `/profile` — account page. Boots the session first, then gates with a return path. */
export const Route = createFileRoute('/profile')({
  beforeLoad: async ({ location }) => {
    await useSessionStore.getState().boot();
    if (useSessionStore.getState().status !== 'authenticated') {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: ProfilePage,
});
