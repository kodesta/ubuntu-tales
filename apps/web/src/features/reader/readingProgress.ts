import { useEffect } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface ReadingProgress {
  /** 0–100, rounded so persisted writes stay meaningful. */
  percent: number;
  /** The last sentence that crossed the reading viewport — stable API id (`s_0001`). */
  lastSentenceId?: string;
  /** ISO 8601 timestamp of the last update. */
  updatedAt: string;
}

interface ReadingProgressState {
  bySlug: Record<string, ReadingProgress>;
  /** Records scroll progress; duplicate writes are ignored so localStorage stays quiet. */
  record: (slug: string, update: { percent: number; lastSentenceId?: string }) => void;
  /** Marks a tale as fully read (Finish tale / celebration screen). */
  markComplete: (slug: string) => void;
  clear: (slug: string) => void;
  reset: () => void;
}

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)));

/**
 * On-device reading position per tale. Phase 2 replaces this with the progress API.
 * Persisted under `ut.progress` (design doc §9).
 */
export const useReadingProgressStore = create<ReadingProgressState>()(
  persist(
    (set) => ({
      bySlug: {},
      record: (slug, update) => {
        if (!slug) return;
        const percent = clampPercent(update.percent);
        set((state) => {
          const previous = state.bySlug[slug];
          if (
            previous &&
            previous.percent === percent &&
            previous.lastSentenceId === update.lastSentenceId
          ) {
            return state;
          }
          return {
            bySlug: {
              ...state.bySlug,
              [slug]: {
                percent,
                lastSentenceId: update.lastSentenceId,
                updatedAt: new Date().toISOString(),
              },
            },
          };
        });
      },
      markComplete: (slug) => {
        if (!slug) return;
        set((state) => ({
          bySlug: {
            ...state.bySlug,
            [slug]: { percent: 100, lastSentenceId: undefined, updatedAt: new Date().toISOString() },
          },
        }));
      },
      clear: (slug) =>
        set((state) => {
          const next = { ...state.bySlug };
          delete next[slug];
          return { bySlug: next };
        }),
      reset: () => set({ bySlug: {} }),
    }),
    {
      name: 'ut.progress',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export interface ReadingPercentInput {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Turns scroll metrics into a 0–100 reading percentage. When the document does not scroll
 * (a very short tale) the whole tale is already visible, so it reads as 100 %.
 */
export function calculateReadingPercent({
  scrollTop,
  scrollHeight,
  clientHeight,
}: ReadingPercentInput): number {
  if (
    !Number.isFinite(scrollTop) ||
    !Number.isFinite(scrollHeight) ||
    !Number.isFinite(clientHeight)
  ) {
    return 0;
  }

  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 100;

  return clampPercent((scrollTop / scrollable) * 100);
}

/** True once a tale has been opened but not finished — the `/saved` "In progress" filter. */
export function isInProgress(progress: ReadingProgress | undefined): boolean {
  if (!progress) return false;
  return progress.percent >= 1 && progress.percent < 100;
}

/** Reads the progress for one tale; selects a stable slice so scroll updates re-render the bar. */
export function useStoryProgress(slug: string): ReadingProgress | undefined {
  return useReadingProgressStore((state) => state.bySlug[slug]);
}

/**
 * Tracks document scroll while the tale is open: persists the percentage and the last sentence
 * that crossed the reading viewport. Writes are throttled to animation frames and deduplicated.
 */
export function useReadingProgressTracking(
  slug: string,
  enabled = true,
): ReadingProgress | undefined {
  const record = useReadingProgressStore((state) => state.record);
  const progress = useStoryProgress(slug);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const html = document.documentElement;
      const percent = calculateReadingPercent({
        scrollTop: window.scrollY,
        scrollHeight: Math.max(html.scrollHeight, document.body.scrollHeight),
        clientHeight: window.innerHeight,
      });

      // The last sentence whose top edge has passed the reading line is our position marker.
      const threshold = window.innerHeight * 0.45;
      let lastSentenceId: string | undefined;
      document.querySelectorAll<HTMLElement>('[data-sentence-id]').forEach((element) => {
        if (element.getBoundingClientRect().top <= threshold) {
          lastSentenceId = element.dataset.sentenceId ?? lastSentenceId;
        }
      });

      record(slug, { percent, lastSentenceId });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [slug, enabled, record]);

  return progress;
}
