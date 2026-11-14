import type { ReactionType } from '@ubuntu-tales/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface ReactionsState {
  bySlug: Record<string, ReactionType>;
  setReaction: (slug: string, reaction: ReactionType) => void;
  clearReaction: (slug: string) => void;
  reset: () => void;
}

/**
 * Local reactions (5 emotions). Persisted under `ut.reactions`; becomes an API write in Phase 2.
 */
export const useReactionsStore = create<ReactionsState>()(
  persist(
    (set) => ({
      bySlug: {},
      setReaction: (slug, reaction) =>
        set((state) => ({ bySlug: { ...state.bySlug, [slug]: reaction } })),
      clearReaction: (slug) =>
        set((state) => {
          const next = { ...state.bySlug };
          delete next[slug];
          return { bySlug: next };
        }),
      reset: () => set({ bySlug: {} }),
    }),
    {
      name: 'ut.reactions',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
