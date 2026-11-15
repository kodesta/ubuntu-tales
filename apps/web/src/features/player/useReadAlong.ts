import { useEffect, useRef, useState } from 'react';

import { usePlayerStore } from './player-store';
import { activeSentenceId } from './readAlong';

const MANUAL_SCROLL_PAUSE_MS = 5000;

/**
 * Read-along: highlights the sentence currently being narrated and keeps it in view. Auto-scroll
 * pauses for a few seconds whenever the reader scrolls manually (production plan 06 §5.2).
 */
export function useReadAlong(storySlug: string | undefined) {
  const narration = usePlayerStore((state) => state.narration);
  const playing = usePlayerStore((state) => state.playing);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const activeId = storySlug && narration ? activeSentenceId(narration.sentenceTimings, positionMs) : null;
  const [follow, setFollow] = useState(true);
  const pauseUntil = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      pauseUntil.current = Date.now() + MANUAL_SCROLL_PAUSE_MS;
      setFollow(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!playing || !activeId) return;
    if (Date.now() < pauseUntil.current) return;

    setFollow(true);
    const element = document.querySelector<HTMLElement>(
      `[data-sentence-id="${CSS.escape(activeId)}"]`,
    );
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (inView) return;
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeId, playing]);

  return {
    activeSentenceId: playing || positionMs > 0 ? activeId : null,
    isFollowing: follow,
  };
}
