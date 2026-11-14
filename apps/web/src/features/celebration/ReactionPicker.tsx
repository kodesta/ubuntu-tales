import { REACTIONS } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';
import { useReactionsStore } from '@/stores/reactions';

import styles from './ReactionPicker.module.css';

export interface ReactionPickerProps {
  storySlug: string;
  className?: string;
}

/**
 * The big end-of-tale reaction picker: emoji, label and meaning for all five emotions.
 * Selection is local-only (`ut.reactions`) and tapping the active emotion clears it.
 */
export function ReactionPicker({ storySlug, className }: ReactionPickerProps) {
  const selected = useReactionsStore((state) => state.bySlug[storySlug]);
  const setReaction = useReactionsStore((state) => state.setReaction);
  const clearReaction = useReactionsStore((state) => state.clearReaction);

  return (
    <div
      className={cn(styles.picker, className)}
      role="group"
      aria-label="How did this tale leave you?"
    >
      {REACTIONS.map((reaction) => {
        const active = selected === reaction.type;
        return (
          <button
            key={reaction.type}
            type="button"
            className={cn(styles.reaction, active && styles.active)}
            aria-pressed={active}
            onClick={() => {
              if (active) {
                clearReaction(storySlug);
              } else {
                setReaction(storySlug, reaction.type);
              }
            }}
          >
            <span className={styles.emoji} aria-hidden="true">
              {reaction.emoji}
            </span>
            <span className={styles.label}>{reaction.label}</span>
            <span className={styles.meaning}>{reaction.meaning}</span>
          </button>
        );
      })}
    </div>
  );
}
