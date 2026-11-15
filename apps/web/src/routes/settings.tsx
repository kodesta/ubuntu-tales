import { createFileRoute, redirect } from '@tanstack/react-router';

import { SettingsPage } from '@/features/profile/SettingsPage';
import { useSessionStore } from '@/stores/session';

/** `/settings` — account, password, devices and local data. Gated like `/profile`. */
export const Route = createFileRoute('/settings')({
  beforeLoad: async ({ location }) => {
    await useSessionStore.getState().boot();
    if (useSessionStore.getState().status !== 'authenticated') {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }
  },
  component: SettingsPage,
});
