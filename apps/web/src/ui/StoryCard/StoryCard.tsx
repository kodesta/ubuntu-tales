import { Link } from '@tanstack/react-router';
import type { StoryCard as StoryCardModel } from '@ubuntu-tales/shared';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { formatReadTime, formatShortDate } from '@/lib/format';

import { CategoryBadge } from '../Badge/Badge';
import { buttonClassName } from '../Button/Button';
import { Image } from '../Image/Image';
import { Meta } from '../Meta/Meta';
import { SaveButton } from '../SaveButton/SaveButton';

import styles from './StoryCard.module.css';

export type StoryCardVariant = 'hero' | 'list' | 'row' | 'mini';

export interface StoryCardProps {
  story: StoryCardModel;
  variant?: StoryCardVariant;
  /** Footer save affordance (row/list); hero always shows it next to the CTA. */
  showSave?: boolean;
  /** Eager-load the cover (Today's tale hero only). */
  priority?: boolean;
  className?: string;
}

function accentStyle(story: StoryCardModel): CSSProperties {
  return { '--accent': story.tribe.accentColor ?? 'var(--terracotta)' } as CSSProperties;
}

function metaLine(story: StoryCardModel) {
  return (
    <Meta as="span" size="micro">
      <span>{story.tribe.name}</span>
      <span>{formatShortDate(story.publishedAt)}</span>
    </Meta>
  );
}

/**
 * The tale card in four editorial postures:
 * - hero: 7/5 "Today's tale" (cover above copy on mobile, right on desktop)
 * - list: vertical cover card for related/archive rails
 * - row: the reading-feed row (112x84 thumb, publication meta, title, 2-line dek)
 * - mini: quiet text-only link for sidebars
 */
export function StoryCard({
  story,
  variant = 'list',
  showSave = true,
  priority = false,
  className,
}: StoryCardProps) {
  const style = accentStyle(story);
  const storyLink = { to: '/stories/$slug' as const, params: { slug: story.slug } };

  if (variant === 'hero') {
    return (
      <article className={cn(styles.hero, className)} style={style}>
        <Link {...storyLink} className={styles.heroArt} tabIndex={-1} aria-hidden="true">
          <span className={styles.mat}>
            <Image
              image={story.cover}
              ratio="3/2"
              loading={priority ? 'eager' : 'lazy'}
              decorative
            />
          </span>
          <span className={styles.coverCaption}>
            {story.regionLabel} · artwork
          </span>
        </Link>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.accentBar} aria-hidden="true" />
            <Link
              to="/tribes/$slug"
              params={{ slug: story.tribe.slug }}
              className={styles.tribeLink}
            >
              {story.tribe.name}
            </Link>
            <span className={styles.separator} aria-hidden="true">
              ·
            </span>
            <span className={styles.categoryName}>{story.category.name}</span>
          </p>
          <h2 className={styles.heroTitle}>
            <Link {...storyLink} className={styles.titleLink}>
              {story.title}
            </Link>
          </h2>
          <p className={styles.heroDek}>{story.summary}</p>
          <Meta as="p" tone="soft" className={styles.heroMeta}>
            {story.narrator ? <span>Narrated by {story.narrator.name}</span> : null}
            <span>{formatReadTime(story.readTimeMinutes)}</span>
            <span>{formatShortDate(story.publishedAt)}</span>
          </Meta>
          <div className={styles.heroActions}>
            <Link
              {...storyLink}
              className={buttonClassName('primary', 'md')}
              aria-label={`Read the tale: ${story.title}`}
            >
              Read the tale
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            {showSave ? <SaveButton story={story} /> : null}
          </div>
        </div>
      </article>
    );
  }

  if (variant === 'row') {
    return (
      <article className={cn(styles.row, className)} style={style}>
        <Link {...storyLink} className={styles.rowThumb} tabIndex={-1} aria-hidden="true">
          <Image image={story.cover} ratio="4/3" decorative />
        </Link>
        <Link {...storyLink} className={styles.rowBody}>
          {metaLine(story)}
          <h3 className={styles.rowTitle}>{story.title}</h3>
          <p className={styles.rowDek}>{story.summary}</p>
        </Link>
        <div className={styles.rowFoot}>
          <CategoryBadge category={story.category} />
          <span className={styles.footMeta}>{formatReadTime(story.readTimeMinutes)}</span>
          <span className={styles.spacer} />
          {showSave ? <SaveButton story={story} size="sm" /> : null}
        </div>
      </article>
    );
  }

  if (variant === 'mini') {
    return (
      <article className={cn(styles.mini, className)} style={style}>
        <Link {...storyLink} className={styles.miniLink}>
          <span className={styles.miniKicker}>{story.tribe.name}</span>
          <span className={styles.miniTitle}>{story.title}</span>
          <span className={styles.miniMeta}>{formatReadTime(story.readTimeMinutes)}</span>
        </Link>
      </article>
    );
  }

  return (
    <article className={cn(styles.list, className)} style={style}>
      <Link {...storyLink} className={styles.listLink}>
        <Image image={story.cover} ratio="3/2" />
        <span className={styles.listBody}>
          <span className={styles.listKicker}>{story.tribe.name}</span>
          <h3 className={styles.listTitle}>{story.title}</h3>
          <p className={styles.listDek}>{story.summary}</p>
        </span>
      </Link>
      <div className={styles.listFoot}>
        <CategoryBadge category={story.category} />
        <Meta as="span" size="micro">
          {formatReadTime(story.readTimeMinutes)}
        </Meta>
        <span className={styles.spacer} />
        {showSave ? <SaveButton story={story} size="sm" /> : null}
      </div>
    </article>
  );
}
