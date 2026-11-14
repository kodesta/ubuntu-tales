import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

import { HomePage } from '@/features/home/HomePage';
import { homeQueryOptions, tribesQueryOptions } from '@/lib/queries';
import { isOnboarded } from '@/stores/onboarding';
import { useSessionStore } from '@/stores/session';
import { readGuestTribe } from '@/stores/tribe';

// Coerce to strings: the router JSON-parses search values (`?q=1` arrives as a number).
const homeSearchSchema = z.object({
  q: z.coerce.string().optional(),
  category: z.coerce.string().optional(),
});

export type HomeSearch = z.infer<typeof homeSearchSchema>;

export const Route = createFileRoute('/')({
  validateSearch: (search) => homeSearchSchema.parse(search),
  beforeLoad: async () => {
    // Restore an existing session before deciding whether this is a first visit.
    const session = useSessionStore.getState();
    if (session.status === 'unknown') await session.boot();
    const authenticated = useSessionStore.getState().status === 'authenticated';
    // First visit: /welcome owns onboarding (design doc §7.1). Returning readers skip it.
    if (!authenticated && !isOnboarded()) {
      throw redirect({ to: '/welcome' });
    }
  },
  loader: ({ context }) => {
    const tribe = readGuestTribe();
    void context.queryClient.prefetchQuery(homeQueryOptions(tribe?.slug));
    void context.queryClient.prefetchQuery(tribesQueryOptions());
  },
  component: HomePage,
});
