import type { StoryBody as StoryBodyModel } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';

import styles from './StoryBody.module.css';

export interface StoryBodyProps {
  body: StoryBodyModel;
  className?: string;
}

/**
 * The tale itself: real `<p>` paragraphs whose sentences are inline `<span data-sentence-id>`.
 * Stable ids come from the API body (`s_0001`…) so read-along can land on them later; the text
 * stays selectable and copyable. No `line-clamp` ever touches body copy.
 */
export function StoryBody({ body, className }: StoryBodyProps) {
  return (
    <div className={cn(styles.body, className)} data-story-body>
      {body.paragraphs.map((paragraph) => (
        <p key={paragraph.id} className={styles.paragraph} data-paragraph-id={paragraph.id}>
          {paragraph.sentences.map((sentence, index) => (
            <span
              key={sentence.id}
              className={styles.sentence}
              data-sentence-id={sentence.id}
            >
              {sentence.text}
              {index < paragraph.sentences.length - 1 ? ' ' : null}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
