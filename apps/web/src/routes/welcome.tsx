import { createFileRoute, redirect } from '@tanstack/react-router';

import { WelcomePage } from '@/features/welcome/WelcomePage';
import { isOnboarded } from '@/stores/onboarding';
import { useSessionStore } from '@/stores/session';

export const Route = createFileRoute('/welcome')({
  beforeLoad: async () => {
    const session = useSessionStore.getState();
    if (session.status === 'unknown') await session.boot();
    const authenticated = useSessionStore.getState().status === 'authenticated';
    // Later visits and signed-in readers skip the welcome (design doc §7.1).
    if (authenticated || isOnboarded()) {
      throw redirect({ to: '/' });
    }
  },
  component: WelcomePage,
});
