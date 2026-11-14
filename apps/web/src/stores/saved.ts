import type { StoryCard } from '@ubuntu-tales/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SavedEntry {
  story: StoryCard;
  /** ISO 8601 timestamp of the save, used for ordering the reading list. */
  savedAt: string;
}

interface SavedState {
  entries: SavedEntry[];
  /**
   * True once the signed-in reading list has been merged in from `GET /me/saved`.
   * Not persisted: it only describes the current session's in-memory mirror.
   */
  hydrated: boolean;
  save: (story: StoryCard) => void;
  unsave: (slug: string) => void;
  /** Returns true when the tale is now saved. */
  toggle: (story: StoryCard) => boolean;
  isSaved: (slug: string) => boolean;
  /**
   * Merges account entries read from the API with anything already on the device. Guest saves
   * must never be dropped here — the guest→account merge (features/auth) reads them separately.
   */
  hydrate: (entries: SavedEntry[]) => void;
  /** Restores a pre-mutation snapshot (optimistic save/unsave rollback). */
  restore: (entries: SavedEntry[]) => void;
  reset: () => void;
}

/**
 * The reading list. Guests keep a snapshot of the StoryCard so `/saved` can render instantly
 * without a network round-trip; signed-in readers mirror `GET /me/saved` into the same store so
 * every save affordance (home, reader, library, saved) reflects the account list.
 * Persisted under `ut.saved` (entries only — see `partialize`).
 */
export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      entries: [],
      hydrated: false,
      save: (story) => {
        set((state) => {
          if (state.entries.some((entry) => entry.story.slug === story.slug)) return state;
          return {
            entries: [{ story, savedAt: new Date().toISOString() }, ...state.entries],
          };
        });
      },
      unsave: (slug) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.story.slug !== slug),
        }));
      },
      toggle: (story) => {
        const saved = get().entries.some((entry) => entry.story.slug === story.slug);
        if (saved) {
          get().unsave(story.slug);
        } else {
          get().save(story);
        }
        return !saved;
      },
      isSaved: (slug) => get().entries.some((entry) => entry.story.slug === slug),
      hydrate: (entries) => {
        set((state) => {
          const bySlug = new Map<string, SavedEntry>();
          for (const entry of entries) bySlug.set(entry.story.slug, entry);
          for (const entry of state.entries) {
            if (!bySlug.has(entry.story.slug)) bySlug.set(entry.story.slug, entry);
          }
          const merged = [...bySlug.values()].sort((a, b) =>
            b.savedAt.localeCompare(a.savedAt),
          );
          return { entries: merged, hydrated: true };
        });
      },
      restore: (entries) => set({ entries }),
      reset: () => set({ entries: [], hydrated: false }),
    }),
    {
      name: 'ut.saved',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);
