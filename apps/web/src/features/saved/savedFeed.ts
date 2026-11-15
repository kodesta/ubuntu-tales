import { infiniteQueryOptions, useInfiniteQuery } from '@tanstack/react-query';
import type { Paginated, SavedFilter, SavedStoryItem } from '@ubuntu-tales/shared';
import { useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { getDeviceId } from '@/lib/device-id';

import { SAVED_PAGE_SIZE } from './savedSync';

/**
 * Cursor-paginated account reading list (`GET /me/saved?filter=…`), one cache slot per filter.
 * The cache key prefix `['saved']` is shared with the optimistic unsave path in `savedSync.ts`,
 * which removes rows instantly without refetching.
 */
export function savedFeedQueryOptions(filter: SavedFilter) {
  return infiniteQueryOptions({
    queryKey: ['saved', filter],
    queryFn: ({ pageParam, signal }) =>
      api.saved.list({
        filter,
        limit: SAVED_PAGE_SIZE,
        cursor: pageParam ?? undefined,
        signal,
        ...(filter === 'offline' ? { deviceId: getDeviceId() } : {}),
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: Paginated<SavedStoryItem>) => lastPage.nextCursor,
    // Plan §4: `me/*` queries are never stale (the account is the source of truth).
    staleTime: 0,
  });
}

export function useSavedFeed(filter: SavedFilter, enabled = true) {
  return useInfiniteQuery({ ...savedFeedQueryOptions(filter), enabled });
}

/** Flattens pages and drops duplicate rows (stable keyset pages can overlap after inserts). */
export function flattenSavedPages(
  pages: readonly Paginated<SavedStoryItem>[] | undefined,
): SavedStoryItem[] {
  if (!pages) return [];
  const seen = new Set<string>();
  const items: SavedStoryItem[] = [];

  for (const page of pages) {
    for (const item of page.items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  return items;
}

export interface SavedSentinelOptions {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | void;
  rootMargin?: string;
}

/** IntersectionObserver sentinel for the saved list (mirrors the library archive pattern). */
export function useSavedSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = '400px',
}: SavedSentinelOptions) {
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
