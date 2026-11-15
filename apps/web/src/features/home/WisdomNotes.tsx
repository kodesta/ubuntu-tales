import { Link } from '@tanstack/react-router';
import type { WisdomNote } from '@ubuntu-tales/shared';

import styles from './WisdomNotes.module.css';

export interface WisdomNotesProps {
  notes: WisdomNote[];
}

/** Five quote cards — horizontal scroll on mobile, stacked in the desktop sidebar. */
export function WisdomNotes({ notes }: WisdomNotesProps) {
  if (notes.length === 0) return null;
  const visible = notes.slice(0, 5);

  return (
    <section className={styles.section} aria-labelledby="wisdom-notes">
      <h2 id="wisdom-notes" className={styles.heading}>
        Wisdom notes
      </h2>
      <ul className={styles.list}>
        {visible.map((note) => (
          <li key={note.id} className={styles.note}>
            <p className={styles.quote}>“{note.quote}”</p>
            <p className={styles.source}>
              <Link to="/stories/$slug" params={{ slug: note.storySlug }}>
                {note.storyTitle}
              </Link>
              <span className={styles.tribe}> · {note.tribeName}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
