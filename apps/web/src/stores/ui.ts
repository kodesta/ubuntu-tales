import { create } from 'zustand';

interface UiState {
  drawerOpen: boolean;
  searchOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
}

/** Ephemeral chrome state: navigation drawer + search overlay. Never persisted. */
export const useUiStore = create<UiState>()((set) => ({
  drawerOpen: false,
  searchOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
}));
