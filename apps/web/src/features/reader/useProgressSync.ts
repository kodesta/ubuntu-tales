import { useEffect } from 'react';

import { api } from '@/lib/api';

import { useReadingProgressStore, type ReadingProgress } from './readingProgress';

/**
 * Text-reader progress sync (Phase 2, roadmap 2.5 web).
 *
 * While signed in, the reader mirrors its local reading marker to `PUT /me/progress/:storyId`
 * every ~10 s and immediately on `visibilitychange: hidden` and unmount. Text reading never claims
 * listening time: `audioPositionMs` and `listenedDeltaSec` are always 0, so stats cannot be
 * inflated. Guests keep the original local-only behaviour (the hook is a no-op).
 */
export const PROGRESS_SYNC_INTERVAL_MS = 10_000;

/** Server clamps percent to 0–100; keep the payload honest before it leaves the client. */
function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export interface UseProgressSyncOptions {
  /** Story UUID (works for both slugs and ids returned by the API). */
  storyId: string | undefined;
  /** Story slug — the local reading-progress store is keyed by slug. */
  slug: string;
  /** Enabled for signed-in readers once the tale has loaded. */
  enabled: boolean;
  intervalMs?: number;
}

interface SentMarker {
  percent: number;
  lastSentenceId?: string;
}

/**
 * Reads the latest marker from the local store (no subscription, so scrolling never re-renders
 * the hook) and writes it when it changed since the last successful sync. A failed write clears
 * the marker so the next tick retries instead of silently dropping the reader's place.
 */
export function useProgressSync({
  storyId,
  slug,
  enabled,
  intervalMs = PROGRESS_SYNC_INTERVAL_MS,
}: UseProgressSyncOptions): void {
  useEffect(() => {
    if (!enabled || !storyId) return;

    let lastSent: SentMarker | null = null;
    let inFlight = false;
    let disposed = false;

    const send = (progress: ReadingProgress | undefined) => {
      if (!progress || inFlight || disposed) return;
      const percent = clampPercent(progress.percent);
      // Never create "started reading" rows before the reader has actually moved through the tale.
      if (percent <= 0) return;
      if (lastSent && lastSent.percent === percent && lastSent.lastSentenceId === progress.lastSentenceId) {
        return;
      }

      inFlight = true;
      lastSent = { percent, lastSentenceId: progress.lastSentenceId };

      void api.progress
        .put(storyId, {
          lastSentenceId: progress.lastSentenceId,
          audioPositionMs: 0,
          percent,
          listenedDeltaSec: 0,
          clientUpdatedAt: progress.updatedAt,
        })
        .catch(() => {
          // Recoverable: keep the local marker and try again on the next tick.
          lastSent = null;
        })
        .finally(() => {
          inFlight = false;
        });
    };

    const flush = () => send(useReadingProgressStore.getState().bySlug[slug]);

    const interval = window.setInterval(flush, intervalMs);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Unmount is the route change to the celebration screen (and every other exit): flush the
      // final marker. The request keeps running after unmount; failures are already swallowed.
      send(useReadingProgressStore.getState().bySlug[slug]);
      disposed = true;
    };
  }, [enabled, storyId, slug, intervalMs]);
}
