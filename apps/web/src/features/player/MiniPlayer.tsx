import { Link } from '@tanstack/react-router';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';

import { cn } from '@/lib/cn';
import { IconButton } from '@/ui';

import { usePlayerStore } from './player-store';
import { formatClock } from './rendition';
import styles from './MiniPlayer.module.css';

/** Slim persistent player in the app shell; hidden on the full-player and completion routes. */
export function MiniPlayer({ className }: { className?: string }) {
  const storySlug = usePlayerStore((state) => state.storySlug);
  const storyTitle = usePlayerStore((state) => state.storyTitle);
  const tribeName = usePlayerStore((state) => state.tribeName);
  const coverUrl = usePlayerStore((state) => state.coverUrl);
  const playing = usePlayerStore((state) => state.playing);
  const positionMs = usePlayerStore((state) => state.positionMs);
  const durationMs = usePlayerStore((state) => state.durationMs);
  const toggle = usePlayerStore((state) => state.toggle);
  const skip = usePlayerStore((state) => state.skip);

  if (!storySlug || !storyTitle) return null;

  const percent = durationMs > 0 ? Math.min(100, (positionMs / durationMs) * 100) : 0;

  return (
    <div className={cn(styles.player, className)} role="region" aria-label="Now playing">
      <div className={styles.progressTrack} aria-hidden="true">
        <div className={styles.progressFill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.inner}>
        <Link to="/stories/$slug/listen" params={{ slug: storySlug }} className={styles.meta}>
          {coverUrl ? (
            <img src={coverUrl} alt="" className={styles.cover} width={40} height={40} loading="lazy" />
          ) : (
            <span className={styles.coverFallback} aria-hidden="true" />
          )}
          <span className={styles.text}>
            <span className={styles.title}>{storyTitle}</span>
            <span className={styles.byline}>
              {tribeName} · {formatClock(positionMs)}
              {durationMs > 0 ? ` / ${formatClock(durationMs)}` : ''}
            </span>
          </span>
        </Link>
        <div className={styles.controls}>
          <IconButton label="Back 15 seconds" size="sm" variant="ghost" onClick={() => skip(-15_000)}>
            <RotateCcw size={18} aria-hidden="true" />
          </IconButton>
          <button
            type="button"
            className={styles.playButton}
            aria-label={playing ? 'Pause narration' : 'Play narration'}
            onClick={() => void toggle()}
          >
            {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
          </button>
          <IconButton
            label="Forward 15 seconds"
            size="sm"
            variant="ghost"
            onClick={() => skip(15_000)}
          >
            <RotateCw size={18} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </div>
  );
}
