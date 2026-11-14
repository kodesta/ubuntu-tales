import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface GuestTribe {
  slug: string;
  name: string;
}

interface TribeState {
  slug: string | null;
  name: string | null;
  setTribe: (tribe: GuestTribe) => void;
  clearTribe: () => void;
}

/**
 * The guest's chosen publication ("your roots"). Phase 1 keeps this on the device;
 * Phase 2 will merge it into the account. Persisted under `ut.tribe`.
 */
export const useTribeStore = create<TribeState>()(
  persist(
    (set) => ({
      slug: null,
      name: null,
      setTribe: ({ slug, name }) => set({ slug, name }),
      clearTribe: () => set({ slug: null, name: null }),
    }),
    {
      name: 'ut.tribe',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function readGuestTribe(): GuestTribe | null {
  const { slug, name } = useTribeStore.getState();
  if (!slug) return null;
  return { slug, name: name ?? slug };
}
