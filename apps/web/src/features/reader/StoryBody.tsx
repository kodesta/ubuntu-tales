import type { StoryBody as StoryBodyModel } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';

import styles from './StoryBody.module.css';

export interface StoryBodyProps {
  body: StoryBodyModel;
  className?: string;
  /** Sentence currently being narrated (read-along); highlighted with `aria-current`. */
  activeSentenceId?: string | null;
  /** Called when a sentence is tapped — the reader page seeks if that narration is loaded. */
  onSentenceActivate?: (sentenceId: string) => void;
}

/**
 * The tale itself: real `<p>` paragraphs whose sentences are inline `<span data-sentence-id>`.
 * Stable ids come from the API body (`s_0001`…) so read-along can land on them; the text stays
 * selectable and copyable. No `line-clamp` ever touches body copy.
 */
export function StoryBody({
  body,
  className,
  activeSentenceId,
  onSentenceActivate,
}: StoryBodyProps) {
  return (
    <div className={cn(styles.body, className)} data-story-body>
      {body.paragraphs.map((paragraph) => (
        <p key={paragraph.id} className={styles.paragraph} data-paragraph-id={paragraph.id}>
          {paragraph.sentences.map((sentence, index) => {
            const active = activeSentenceId === sentence.id;
            return (
              <span
                key={sentence.id}
                className={cn(styles.sentence, active && styles.sentenceActive)}
                data-sentence-id={sentence.id}
                aria-current={active ? 'true' : undefined}
                {...(onSentenceActivate
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      onClick: () => onSentenceActivate(sentence.id),
                      onKeyDown: (event: React.KeyboardEvent<HTMLSpanElement>) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onSentenceActivate(sentence.id);
                        }
                      },
                    }
                  : {})}
              >
                {sentence.text}
                {index < paragraph.sentences.length - 1 ? ' ' : null}
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
