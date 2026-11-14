import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const STORAGE_KEY = 'ut.onboarded';

interface OnboardingState {
  onboarded: boolean;
  complete: () => void;
  reset: () => void;
}

/**
 * First-visit flag. Persisted under `ut.onboarded`; `/welcome` sends already-onboarded readers home.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      onboarded: false,
      complete: () => set({ onboarded: true }),
      reset: () => set({ onboarded: false }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Reads the flag defensively: the Zustand persist envelope is JSON, but we also accept a raw
 * "true"/"1" so a hand-set localStorage value still works for QA and deep links.
 */
export function isOnboarded(): boolean {
  if (useOnboardingStore.getState().onboarded) return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    if (raw === 'true' || raw === '1') return true;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'state' in parsed) {
      const state = (parsed as { state?: { onboarded?: unknown } }).state;
      return state?.onboarded === true;
    }
    return false;
  } catch {
    return false;
  }
}
