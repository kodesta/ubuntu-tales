import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { SavedPage } from '@/features/saved/SavedPage';

/** Optional (and forgiving) so `/saved` deep links work with or without a filter. */
const savedSearchSchema = z.object({
  filter: z.enum(['all', 'in-progress', 'offline']).optional().catch(undefined),
});

export type SavedSearch = z.infer<typeof savedSearchSchema>;

/** `/saved?filter=all|in-progress|offline` — the on-device reading list. */
export const Route = createFileRoute('/saved')({
  validateSearch: (search) => savedSearchSchema.parse(search),
  component: SavedPage,
});
