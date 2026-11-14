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
  save: (story: StoryCard) => void;
  unsave: (slug: string) => void;
  /** Returns true when the tale is now saved. */
  toggle: (story: StoryCard) => boolean;
  isSaved: (slug: string) => boolean;
  reset: () => void;
}

/**
 * On-device reading list. We keep a snapshot of the StoryCard so `/saved` can render instantly
 * without a network round-trip; Phase 2 replaces this with `GET /me/saved`.
 * Persisted under `ut.saved`.
 */
export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      entries: [],
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
      reset: () => set({ entries: [] }),
    }),
    {
      name: 'ut.saved',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
