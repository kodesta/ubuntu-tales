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

export function useRecommendations(slug: string, options: { enabled?: boolean } = {}) {
  return useQuery({ ...recommendationsQueryOptions(slug), enabled: options.enabled ?? true });
}

/**
 * Marks a signed-in tale complete and returns the server's celebration payload
 * (`{ progress, stats, recommendations }`). Kept as a query rather than a mutation so the
 * reader's "Finish tale" call and the completion screen share one cache entry — `staleTime:
 * Infinity` means the celebration never re-posts while the reader is on the screen.
 */
export const completeStoryQueryOptions = (slug: string, storyId: string | undefined) =>
  queryOptions({
    queryKey: ['complete', slug, storyId ?? ''] as const,
    queryFn: () => api.progress.complete(storyId as string),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 5 * 60_000,
  });

export function useCompleteStory(slug: string, storyId: string | undefined, enabled: boolean) {
  return useQuery({
    ...completeStoryQueryOptions(slug, storyId),
    enabled: enabled && Boolean(storyId),
  });
}
