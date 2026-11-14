import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import type { AuthorSummary, Paginated, StoryCard } from '@ubuntu-tales/shared';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { CATALOGUE_STALE_TIME } from '@/lib/queries';

export const LIBRARY_PAGE_SIZE = 12;

export type ArchiveTab = 'stories' | 'audio';

/**
 * Flattens `useInfiniteQuery` pages into one list, dropping duplicate rows that can appear when a
 * keyset page overlaps a fresh page (the API is stable, but the client should never double-render).
 */
export function flattenPages<T extends { id: string }>(
  pages: readonly Paginated<T>[] | undefined,
): T[] {
  if (!pages) return [];
  const seen = new Set<string>();
  const items: T[] = [];

  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
}

/** Cursor-paginated archive feed for `/library?tab=stories|audio` (one cache slot per tab/filter). */
export function libraryFeedQueryOptions(tab: ArchiveTab, category = '') {
  return infiniteQueryOptions({
    queryKey: ['library-feed', tab, category],
    queryFn: ({ pageParam, signal }) =>
      api.getLibrary(tab, {
        category: category || undefined,
        cursor: pageParam ?? undefined,
        limit: LIBRARY_PAGE_SIZE,
        signal,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: Paginated<StoryCard>) => lastPage.nextCursor,
    staleTime: CATALOGUE_STALE_TIME,
  });
}

export function useLibraryFeed(tab: ArchiveTab, category = '') {
  return useInfiniteQuery(libraryFeedQueryOptions(tab, category));
}

/** Cursor-paginated voices feed for `/library?tab=authors`. */
export const voicesFeedQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: ['library-voices'],
    queryFn: ({ pageParam, signal }) =>
      api.getVoices({ cursor: pageParam ?? undefined, limit: LIBRARY_PAGE_SIZE, signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: Paginated<AuthorSummary>) => lastPage.nextCursor,
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useVoicesFeed() {
  return useInfiniteQuery(voicesFeedQueryOptions());
}

export interface InfiniteSentinelOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | void;
  rootMargin?: string;
}

/**
 * IntersectionObserver sentinel: when the end-mark scrolls into range the next cursor page loads.
 * Returns the ref to attach; browsers without IntersectionObserver should render a manual
 * "Load more" button instead.
 */
export function useInfiniteSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '400px',
}: InfiniteSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, rootMargin]);

  return sentinelRef;
}
