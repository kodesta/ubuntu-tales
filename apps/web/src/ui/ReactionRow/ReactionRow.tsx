import { REACTIONS } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';
import { useReactionsStore } from '@/stores/reactions';

import styles from './ReactionRow.module.css';

export interface ReactionRowProps {
  storySlug: string;
  className?: string;
}

/** Five deliberate emotions — the only place emoji appear in the product. */
export function ReactionRow({ storySlug, className }: ReactionRowProps) {
  const selected = useReactionsStore((state) => state.bySlug[storySlug]);
  const setReaction = useReactionsStore((state) => state.setReaction);

  return (
    <div className={cn(styles.row, className)} role="group" aria-label="React to this tale">
      {REACTIONS.map((reaction) => {
        const active = selected === reaction.type;
        return (
          <button
            key={reaction.type}
            type="button"
            className={cn(styles.reaction, active && styles.active)}
            aria-pressed={active}
            aria-label={`${reaction.label} — ${reaction.meaning}`}
            title={reaction.meaning}
            onClick={() =>
              active ? undefined : setReaction(storySlug, reaction.type)
            }
          >
            <span className={styles.emoji} aria-hidden="true">
              {reaction.emoji}
            </span>
            <span className={styles.label}>{reaction.label}</span>
          </button>
        );
      })}
    </div>
  );
}
