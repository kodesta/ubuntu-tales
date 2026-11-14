import { Link } from '@tanstack/react-router';
import type { StoryCard as StoryCardModel } from '@ubuntu-tales/shared';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { formatReadTime, formatShortDate } from '@/lib/format';

import { CategoryBadge } from '../Badge/Badge';
import { Image } from '../Image/Image';
import { Meta } from '../Meta/Meta';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import { SaveButton } from '../SaveButton/SaveButton';

import styles from './TaleRow.module.css';

export interface TaleRowProps {
  story: StoryCardModel;
  /** Renders a progress hairline + "Continue reading" when the tale is in progress. */
  progressPercent?: number;
  /** Optional extra action (e.g. a continue link); placed before the save button. */
  action?: ReactNode;
  showSave?: boolean;
  className?: string;
}

/**
 * Archive list row (library / saved): 96x72 cover, title, publication and date, category badge,
 * read time, save. Deliberately quieter than the editorial feed row.
 */
export function TaleRow({
  story,
  progressPercent,
  action,
  showSave = true,
  className,
}: TaleRowProps) {
  const style = { '--accent': story.tribe.accentColor ?? 'var(--terracotta)' } as CSSProperties;
  const hasProgress = typeof progressPercent === 'number' && progressPercent > 0;

  return (
    <article className={cn(styles.row, className)} style={style}>
      <Link to="/stories/$slug" params={{ slug: story.slug }} className={styles.cover} tabIndex={-1} aria-hidden="true">
        <Image image={story.cover} ratio="4/3" decorative />
      </Link>
      <div className={styles.body}>
        <Meta as="span" size="micro">
          <span>{story.tribe.name}</span>
          <span>{formatShortDate(story.publishedAt)}</span>
        </Meta>
        <h3 className={styles.title}>
          <Link to="/stories/$slug" params={{ slug: story.slug }}>
            {story.title}
          </Link>
        </h3>
        <div className={styles.foot}>
          <CategoryBadge category={story.category} />
          <span className={styles.readTime}>{formatReadTime(story.readTimeMinutes)}</span>
          {action ? <span className={styles.action}>{action}</span> : null}
          <span className={styles.spacer} />
          {showSave ? <SaveButton story={story} size="sm" /> : null}
        </div>
        {hasProgress ? (
          <div className={styles.progress}>
            <ProgressBar
              value={progressPercent}
              size="hairline"
              accentColor={story.tribe.accentColor}
              label={`Reading progress for ${story.title}`}
            />
            <span className={styles.progressLabel}>{Math.round(progressPercent)}% read</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
