import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { CATALOGUE_STALE_TIME } from '@/lib/queries';

/**
 * Reader-owned queries. They live beside the feature so `src/lib/queries.ts` (web-core) stays the
 * shared catalogue surface. Keys mirror the plan's `['story', slug]` convention.
 */
export const storyQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['story', slug],
    queryFn: ({ signal }) => api.getStory(slug, { signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useStory(slug: string) {
  return useQuery(storyQueryOptions(slug));
}

export const recommendationsQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['recommendations', slug],
    queryFn: ({ signal }) => api.getRecommendations(slug, { signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useRecommendations(slug: string) {
  return useQuery(recommendationsQueryOptions(slug));
}
