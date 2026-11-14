import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { LibraryPage } from '@/features/library/LibraryPage';

/**
 * Search values arrive JSON-parsed from TanStack Router, so the enum is defensive: anything
 * unexpected falls back to `undefined` and the page defaults to the tales tab. Keeping every key
 * optional means plain `<Link to="/library">` still typechecks and deep links stay forgiving.
 */
const librarySearchSchema = z.object({
  tab: z.enum(['stories', 'audio', 'authors']).optional().catch(undefined),
  category: z.string().optional(),
});

export type LibrarySearch = z.infer<typeof librarySearchSchema>;

/** `/library?tab=stories|audio|authors` — the archive. Tab state lives in the URL. */
export const Route = createFileRoute('/library')({
  validateSearch: (search) => librarySearchSchema.parse(search),
  component: LibraryPage,
});
