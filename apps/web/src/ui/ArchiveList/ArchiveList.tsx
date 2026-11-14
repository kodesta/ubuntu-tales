import { Link } from '@tanstack/react-router';
import type { StoryCard as StoryCardModel } from '@ubuntu-tales/shared';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { formatReadTime, formatShortDate } from '@/lib/format';

import { CategoryBadge } from '../Badge/Badge';
import { SaveButton } from '../SaveButton/SaveButton';

import styles from './ArchiveList.module.css';

export interface ArchiveListProps {
  stories: StoryCardModel[];
  className?: string;
}

/** Numbered editorial archive (01, 02, 03…) used on publication pages. */
export function ArchiveList({ stories, className }: ArchiveListProps) {
  return (
    <ol className={cn(styles.list, className)}>
      {stories.map((story, index) => {
        const style = {
          '--accent': story.tribe.accentColor ?? 'var(--terracotta)',
        } as CSSProperties;

        return (
          <li key={story.id} className={styles.item} style={style}>
            <span className={styles.index} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={styles.body}>
              <h3 className={styles.title}>
                <Link to="/stories/$slug" params={{ slug: story.slug }}>
                  {story.title}
                </Link>
              </h3>
              <p className={styles.dek}>{story.summary}</p>
              <div className={styles.metaRow}>
                <CategoryBadge category={story.category} />
                <span className={styles.meta}>{formatShortDate(story.publishedAt)}</span>
                <span className={styles.meta}>{formatReadTime(story.readTimeMinutes)}</span>
              </div>
            </div>
            <div className={styles.save}>
              <SaveButton story={story} size="sm" />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
