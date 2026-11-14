import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface FollowsState {
  slugs: string[];
  follow: (slug: string) => void;
  unfollow: (slug: string) => void;
  /** Returns true when this call left the publication followed. */
  toggle: (slug: string) => boolean;
  reset: () => void;
}

/**
 * Local-only publication follows until accounts land. Persisted under `ut.follows`.
 * Components should select `slugs` and test membership so they re-render on change.
 */
export const useFollowsStore = create<FollowsState>()(
  persist(
    (set, get) => ({
      slugs: [],
      follow: (slug) => {
        if (!slug) return;
        set((state) =>
          state.slugs.includes(slug) ? state : { slugs: [...state.slugs, slug] },
        );
      },
      unfollow: (slug) => {
        set((state) => ({ slugs: state.slugs.filter((entry) => entry !== slug) }));
      },
      toggle: (slug) => {
        const following = get().slugs.includes(slug);
        if (following) {
          get().unfollow(slug);
        } else {
          get().follow(slug);
        }
        return !following;
      },
      reset: () => set({ slugs: [] }),
    }),
    {
      name: 'ut.follows',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
