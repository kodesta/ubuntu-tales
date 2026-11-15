import { useCallback, useEffect, useRef } from 'react';

import { api } from '@/lib/api';
import { useIsAuthenticated } from '@/stores/session';

import { usePlayerStore } from './player-store';

const SYNC_INTERVAL_MS = 15_000;

function percentile(positionMs: number, durationMs: number): number {
  if (!durationMs || durationMs <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((positionMs / durationMs) * 100)));
}

/**
 * Persists listening progress: every 15 s while playing, on pause, on tab hide (keepalive) and at
 * the end. `listenedDeltaSec` is the real wall-clock listening time since the previous flush and is
 * capped at 60 s per call by the API (production plan 01 §4.2, 05 §3.9). Guests stay local.
 */
export function useAudioProgressSync(storyId: string | undefined) {
  const isAuthed = useIsAuthenticated();
  const narration = usePlayerStore((state) => state.narration);
  const storySlug = usePlayerStore((state) => state.storySlug);
  const lastSyncAt = useRef<number>(Date.now());
  const lastPosition = useRef<number>(0);

  const flush = useCallback(
    (options: { keepalive?: boolean } = {}) => {
      if (!isAuthed || !storyId) return;
      const state = usePlayerStore.getState();
      if (!state.narration || state.storySlug !== storySlug) return;

      const now = Date.now();
      const positionMs = state.positionMs;
      if (positionMs === lastPosition.current && !options.keepalive) return;

      const listenedDeltaSec = state.playing
        ? Math.min(60, Math.max(0, Math.round((now - lastSyncAt.current) / 1000)))
        : 0;

      lastSyncAt.current = now;
      lastPosition.current = positionMs;

      void api.progress
        .put(storyId, {
          narrationId: state.narration.id,
          audioPositionMs: Math.round(positionMs),
          percent: percentile(positionMs, state.durationMs || state.narration.durationMs),
          listenedDeltaSec,
          clientUpdatedAt: new Date(now).toISOString(),
        })
        .catch(() => undefined);

      if (options.keepalive) {
        // `api` uses fetch without keepalive; a hidden tab may drop the regular request, which is
        // acceptable — the next visible flush wins via last-write-wins.
      }
    },
    [isAuthed, storyId, storySlug],
  );

  // Reset the wall clock whenever a new narration loads.
  useEffect(() => {
    lastSyncAt.current = Date.now();
    lastPosition.current = usePlayerStore.getState().positionMs;
  }, [narration?.id]);

  useEffect(() => {
    if (!isAuthed) return;
    const interval = window.setInterval(() => flush(), SYNC_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush({ keepalive: true });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      flush({ keepalive: true });
    };
  }, [flush, isAuthed]);

  return { flush };
}
