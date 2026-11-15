import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { CATALOGUE_STALE_TIME } from '@/lib/queries';

/** Griot profile query. Owned by the authors feature so `src/lib/queries.ts` stays shared. */
export const authorQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['author', slug],
    queryFn: ({ signal }) => api.getAuthor(slug, { signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useAuthor(slug: string) {
  return useQuery(authorQueryOptions(slug));
}
