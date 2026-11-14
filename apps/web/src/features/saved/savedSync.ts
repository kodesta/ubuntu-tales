import { type InfiniteData, type QueryClient } from '@tanstack/react-query';
import type { Paginated, SavedStoryItem, StoryCard } from '@ubuntu-tales/shared';

import { api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { useSessionStore } from '@/stores/session';
import { useSavedStore, type SavedEntry } from '@/stores/saved';
import { ON_DEVICE_NOTE, useToastStore } from '@/stores/toast';

/**
 * Phase 2 sync layer for the reading list.
 *
 * Guests keep the original local-only behaviour (`ut.saved`). Signed-in readers keep the same
 * store as an in-memory mirror of `GET /me/saved`: hydrated once per session, updated
 * optimistically on save/unsave and rolled back when the API refuses the write.
 */

/** `useInfiniteQuery` slot prefix shared by every signed-in saved-list filter. */
export const SAVED_QUERY_ROOT = ['saved'] as const;

/** How many account saves are mirrored into the store for icon state. */
export const SAVED_HYDRATE_LIMIT = 50;

/** Page size for `/saved`'s cursor feed. */
export const SAVED_PAGE_SIZE = 12;

/** Converts an API row into the snapshot shape the local store already uses. */
export function savedItemToEntry(item: SavedStoryItem): SavedEntry {
  const { savedAt, progressPercent: _progressPercent, completed: _completed, reflection: _reflection, ...story } =
    item;
  return { story: story as StoryCard, savedAt };
}

let hydrateInFlight: Promise<void> | null = null;

/**
 * Loads the first page of the account reading list into the saved store. Single-flight, and a
 * no-op for guests. Failures are swallowed: the local snapshot (or the per-response viewer
 * overlay) remains the fallback so the reader never loses their place because of a sync hiccup.
 */
export function hydrateSavedFromApi(): Promise<void> {
  if (useSessionStore.getState().status !== 'authenticated') return Promise.resolve();
  if (hydrateInFlight) return hydrateInFlight;

  hydrateInFlight = (async () => {
    try {
      const page = await api.saved.list({ filter: 'all', limit: SAVED_HYDRATE_LIMIT });
      useSavedStore.getState().hydrate(page.items.map(savedItemToEntry));
    } catch {
      // Offline, or the API is still the pre-auth build — keep whatever is on the device.
    } finally {
      hydrateInFlight = null;
    }
  })();

  return hydrateInFlight;
}

/**
 * Installs the session-driven hydration exactly once per page load:
 * - signed in (login or refresh-on-boot) → mirror `GET /me/saved` into the store;
 * - signed out (logout / failed refresh) → clear the account mirror so it never leaks into guest
 *   mode. Guest saves made before signing in were already merged/cleared by `features/auth`.
 *
 * Called from the module scope below: every surface that renders a `SaveButton` imports this
 * module, so the sync is installed app-wide without touching the root providers.
 */
export function installSavedSessionSync(): () => void {
  if (useSessionStore.getState().status === 'authenticated') {
    void hydrateSavedFromApi();
  }

  return useSessionStore.subscribe((state, previous) => {
    if (state.status === previous.status) return;
    if (state.status === 'authenticated') {
      void hydrateSavedFromApi();
      return;
    }
    if (previous.status === 'authenticated') {
      useSavedStore.getState().reset();
    }
  });
}

installSavedSessionSync();

/** Effective saved state for a tale: store mirror once hydrated, else the API viewer overlay. */
export function isStorySaved(story: StoryCard, hydrated: boolean): boolean {
  const inStore = useSavedStore
    .getState()
    .entries.some((entry) => entry.story.slug === story.slug);
  if (hydrated) return inStore;
  return story.viewer?.saved ?? inStore;
}

export type SavedToggleStatus = 'guest' | 'synced' | 'failed';

export interface SavedToggleOutcome {
  saved: boolean;
  status: SavedToggleStatus;
}

function removeFromSavedCaches(story: StoryCard, client: QueryClient): void {
  client.setQueriesData<InfiniteData<Paginated<SavedStoryItem>>>(
    { queryKey: SAVED_QUERY_ROOT },
    (data) => {
      if (!data) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.id !== story.id && item.slug !== story.slug),
        })),
      };
    },
  );
}

/**
 * Saves or unsaves a tale. Guests keep the untouched local behaviour and confirm with the
 * "accounts are coming soon" toast; signed-in readers get an optimistic store + query-cache
 * update, an idempotent API write and a rollback when the write fails.
 *
 * `currentlySaved` is passed by the caller because it may come from the viewer overlay before the
 * store has hydrated.
 */
export async function toggleSavedWithSync(
  story: StoryCard,
  currentlySaved: boolean,
  client: QueryClient = queryClient,
): Promise<SavedToggleOutcome> {
  // A tap during the boot refresh must not be mistaken for a guest save on a signed-in device.
  if (useSessionStore.getState().status === 'unknown') {
    await useSessionStore.getState().boot();
  }
  const { status } = useSessionStore.getState();

  if (status !== 'authenticated') {
    const nowSaved = useSavedStore.getState().toggle(story);
    return { saved: nowSaved, status: 'guest' };
  }

  const nextSaved = !currentlySaved;
  const snapshot = useSavedStore.getState().entries;

  if (nextSaved) {
    useSavedStore.getState().save(story);
  } else {
    useSavedStore.getState().unsave(story.slug);
    removeFromSavedCaches(story, client);
  }

  try {
    if (nextSaved) {
      await api.saved.save(story.id);
      void client.invalidateQueries({ queryKey: SAVED_QUERY_ROOT });
    } else {
      await api.saved.unsave(story.id);
    }
    return { saved: nextSaved, status: 'synced' };
  } catch {
    useSavedStore.getState().restore(snapshot);
    void client.invalidateQueries({ queryKey: SAVED_QUERY_ROOT });
    return { saved: currentlySaved, status: 'failed' };
  }
}

/** One consistent toast voice for every save affordance (button, reader end matter, saved list). */
export function announceSavedToggle(outcome: SavedToggleOutcome): void {
  const show = useToastStore.getState().show;
  if (outcome.status === 'failed') {
    show('We could not update your reading list. Please try again.');
    return;
  }
  if (outcome.status === 'guest') {
    show(outcome.saved ? ON_DEVICE_NOTE : 'Removed from your reading list.');
    return;
  }
  show(outcome.saved ? 'Saved to your reading list.' : 'Removed from your reading list.', {
    variant: outcome.saved ? 'success' : 'default',
  });
}

/** Removes one page item from the saved-list caches after an instant unsave from `/saved`. */
export function removeSavedItemFromCaches(story: StoryCard, client: QueryClient = queryClient): void {
  removeFromSavedCaches(story, client);
}
