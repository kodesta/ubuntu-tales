import { createFileRoute, redirect } from '@tanstack/react-router';

import { WelcomePage } from '@/features/welcome/WelcomePage';
import { isOnboarded } from '@/stores/onboarding';

export const Route = createFileRoute('/welcome')({
  beforeLoad: () => {
    // Later visits skip the welcome (design doc §7.1).
    if (isOnboarded()) {
      throw redirect({ to: '/' });
    }
  },
  component: WelcomePage,
});
