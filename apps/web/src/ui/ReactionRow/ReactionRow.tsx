import type { ReactionType } from '@ubuntu-tales/shared';
import { REACTIONS } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';

import styles from './ReactionRow.module.css';
import { useStoryReaction } from './useReactionSync';

export interface ReactionRowProps {
  storySlug: string;
  /** Story UUID from the API payload — required before account reactions can sync. */
  storyId?: string;
  /** Viewer overlay from an authenticated response (`story.viewer.reaction`). */
  viewerReaction?: ReactionType | null;
  /** Show public counts once the summary loads (defaults on). */
  showCounts?: boolean;
  className?: string;
}

/** Five deliberate emotions — the only place emoji appear in the product. */
export function ReactionRow({
  storySlug,
  storyId,
  viewerReaction = null,
  showCounts = true,
  className,
}: ReactionRowProps) {
  const { selected, total, countFor, choose } = useStoryReaction({
    storySlug,
    storyId,
    initialReaction: viewerReaction,
  });

  return (
    <div className={cn(styles.row, className)} role="group" aria-label="React to this tale">
      {REACTIONS.map((reaction) => {
        const active = selected === reaction.type;
        const count = showCounts && total > 0 ? countFor(reaction.type) : 0;
        return (
          <button
            key={reaction.type}
            type="button"
            className={cn(styles.reaction, active && styles.active)}
            aria-pressed={active}
            aria-label={`${reaction.label}${
              count > 0 ? `, ${count} ${count === 1 ? 'reader' : 'readers'}` : ''
            } — ${reaction.meaning}`}
            title={reaction.meaning}
            onClick={() => {
              if (active) return;
              choose(reaction.type);
            }}
          >
            <span className={styles.emoji} aria-hidden="true">
              {reaction.emoji}
            </span>
            <span className={styles.label}>{reaction.label}</span>
            {count > 0 ? <span className={styles.count}>{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
