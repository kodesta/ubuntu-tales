import { queryOptions, useQuery } from '@tanstack/react-query';
import type { LibraryTab, StoryListQuery, TribeListQuery } from '@ubuntu-tales/shared';

import { useTribeStore } from '@/stores/tribe';

import { api } from './api';

/**
 * Query options live here so loaders can prefetch exactly what the hooks consume.
 * Keys use plain primitives/objects — TanStack Query hashes them deterministically.
 */
export const CATALOGUE_STALE_TIME = 60_000;
const CONFIG_STALE_TIME = 5 * 60_000;
const SUGGESTION_STALE_TIME = 30_000;

export const homeQueryOptions = (tribe?: string | null) =>
  queryOptions({
    queryKey: ['home', tribe ?? null],
    queryFn: ({ signal }) => api.getHome({ tribe: tribe ?? undefined, signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useHome() {
  const tribe = useTribeStore((state) => state.slug);
  return useQuery(homeQueryOptions(tribe));
}

export const exploreQueryOptions = () =>
  queryOptions({
    queryKey: ['explore'],
    queryFn: ({ signal }) => api.getExplore({ signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useExplore() {
  return useQuery(exploreQueryOptions());
}

export const tribesQueryOptions = (query: TribeListQuery = {}) =>
  queryOptions({
    queryKey: ['tribes', query.q ?? '', query.region ?? ''],
    queryFn: ({ signal }) => api.getTribes({ ...query, signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useTribes(query: TribeListQuery = {}) {
  return useQuery(tribesQueryOptions(query));
}

export const tribeQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ['tribe', slug],
    queryFn: ({ signal }) => api.getTribe(slug, { signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useTribe(slug: string) {
  return useQuery(tribeQueryOptions(slug));
}

export const categoriesQueryOptions = () =>
  queryOptions({
    queryKey: ['categories'],
    queryFn: ({ signal }) => api.getCategories({ signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useCategories() {
  return useQuery(categoriesQueryOptions());
}

export const configQueryOptions = () =>
  queryOptions({
    queryKey: ['config'],
    queryFn: ({ signal }) => api.getConfig({ signal }),
    staleTime: CONFIG_STALE_TIME,
  });

export function usePublicConfig() {
  return useQuery(configQueryOptions());
}

export const storyListQueryOptions = (query: StoryListQuery = {}) =>
  queryOptions({
    queryKey: [
      'stories',
      query.q ?? '',
      query.tribe ?? '',
      query.category ?? '',
      query.region ?? '',
      query.sort ?? 'recent',
      query.limit ?? 12,
      query.cursor ?? '',
    ],
    queryFn: ({ signal }) => api.getStories({ ...query, signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useStories(query: StoryListQuery & { enabled?: boolean } = {}) {
  const { enabled = true, ...listQuery } = query;
  return useQuery({ ...storyListQueryOptions(listQuery), enabled });
}

export const searchSuggestionsQueryOptions = (q: string) =>
  queryOptions({
    queryKey: ['search-suggestions', q],
    queryFn: ({ signal }) => api.getSearchSuggestions(q, { signal }),
    staleTime: SUGGESTION_STALE_TIME,
  });

export function useSearchSuggestions(q: string) {
  const term = q.trim();
  return useQuery({
    ...searchSuggestionsQueryOptions(term),
    enabled: term.length >= 2,
  });
}

export const libraryQueryOptions = (tab: Exclude<LibraryTab, 'authors'>, q = '') =>
  queryOptions({
    queryKey: ['library', tab, q],
    queryFn: ({ signal }) => api.getLibrary(tab, { q: q || undefined, signal }),
    staleTime: CATALOGUE_STALE_TIME,
  });

export function useLibrary(tab: Exclude<LibraryTab, 'authors'>) {
  return useQuery(libraryQueryOptions(tab));
}
