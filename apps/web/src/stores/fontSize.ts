import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const FONT_SIZES = ['sm', 'md', 'lg'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

/** Story body sizes, matching the plan's sm/md/lg preference (base body is 19px). */
export const FONT_SIZE_VALUES: Record<FontSize, string> = {
  sm: '1.0625rem',
  md: '1.1875rem',
  lg: '1.375rem',
};

export const FONT_SIZE_LABELS: Record<FontSize, string> = {
  sm: 'Small',
  md: 'Medium',
  lg: 'Large',
};

interface FontSizeState {
  size: FontSize;
  setSize: (size: FontSize) => void;
  /** Steps through the sizes; direction 1 = larger, -1 = smaller. Persisted under `ut.fontSize`. */
  cycle: (direction?: 1 | -1) => FontSize;
  reset: () => void;
}

export const useFontSizeStore = create<FontSizeState>()(
  persist(
    (set, get) => ({
      size: 'md',
      setSize: (size) => set({ size }),
      cycle: (direction = 1) => {
        const index = FONT_SIZES.indexOf(get().size);
        const next =
          FONT_SIZES[Math.min(FONT_SIZES.length - 1, Math.max(0, index + direction))] ??
          get().size;
        set({ size: next });
        return next;
      },
      reset: () => set({ size: 'md' }),
    }),
    {
      name: 'ut.fontSize',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
