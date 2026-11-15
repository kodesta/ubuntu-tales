import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { TribesPage } from '@/features/tribes/TribesPage';
import { configQueryOptions, tribesQueryOptions } from '@/lib/queries';

/**
 * `?onboarding=1` arrives as the number 1 because the router JSON-parses search values, while a
 * typed link can pass either. Accept both and treat `1` as the flag.
 */
const tribesSearchSchema = z.object({
  onboarding: z.union([z.string(), z.number()]).optional(),
});

export type TribesSearch = z.infer<typeof tribesSearchSchema>;

export const Route = createFileRoute('/tribes/')({
  validateSearch: (search) => tribesSearchSchema.parse(search),
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(tribesQueryOptions());
    void context.queryClient.prefetchQuery(configQueryOptions());
  },
  component: TribesPage,
});
