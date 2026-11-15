import type { ReactionType } from '@ubuntu-tales/shared';
import { REACTIONS } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';
import { useStoryReaction } from '@/ui/ReactionRow/useReactionSync';

import styles from './ReactionPicker.module.css';

export interface ReactionPickerProps {
  storySlug: string;
  /** Story UUID from the API payload — required before account reactions can sync. */
  storyId?: string;
  /** Viewer overlay from an authenticated response (`story.viewer.reaction`). */
  viewerReaction?: ReactionType | null;
  className?: string;
}

/**
 * The big end-of-tale reaction picker: emoji, label and meaning for all five emotions.
 * Guests keep the local-only selection; signed-in readers sync through the reactions API and see
 * the public counts ("N readers felt this"). Tapping the active emotion clears it.
 */
export function ReactionPicker({
  storySlug,
  storyId,
  viewerReaction = null,
  className,
}: ReactionPickerProps) {
  const { selected, total, countFor, choose, clear } = useStoryReaction({
    storySlug,
    storyId,
    initialReaction: viewerReaction,
  });

  return (
    <div
      className={cn(styles.picker, className)}
      role="group"
      aria-label="How did this tale leave you?"
    >
      {REACTIONS.map((reaction) => {
        const active = selected === reaction.type;
        const count = total > 0 ? countFor(reaction.type) : 0;
        return (
          <button
            key={reaction.type}
            type="button"
            className={cn(styles.reaction, active && styles.active)}
            aria-pressed={active}
            // The visible label, count and meaning form the accessible name (WCAG 2.5.3).
            onClick={() => {
              if (active) {
                clear();
              } else {
                choose(reaction.type);
              }
            }}
          >
            <span className={styles.emoji} aria-hidden="true">
              {reaction.emoji}
            </span>
            <span className={styles.labelRow}>
              <span className={styles.label}>{reaction.label}</span>
              {count > 0 ? <span className={styles.count}>{count}</span> : null}
            </span>
            <span className={styles.meaning}>{reaction.meaning}</span>
          </button>
        );
      })}
    </div>
  );
}
