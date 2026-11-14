import { Link } from '@tanstack/react-router';
import type { TribeSummary } from '@ubuntu-tales/shared';
import { Check } from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { formatReaderCount, formatTaleCount } from '@/lib/format';

import { FollowButton } from '../FollowButton/FollowButton';
import { PublicationMark } from '../PublicationMark/PublicationMark';

import styles from './PublicationCard.module.css';

export type PublicationCardVariant = 'default' | 'rail';

export interface PublicationCardProps {
  tribe: TribeSummary;
  variant?: PublicationCardVariant;
  /** Onboarding mode: the card becomes a radio-like selection button. */
  onSelect?: (tribe: TribeSummary) => void;
  selected?: boolean;
  className?: string;
}

/**
 * Publication card: cover mark, name (Lora 1.5rem), tagline, `N tales · M readers` and a follow
 * pill. In onboarding mode the whole card is a selectable button instead of a link.
 */
export function PublicationCard({
  tribe,
  variant = 'default',
  onSelect,
  selected = false,
  className,
}: PublicationCardProps) {
  const style = { '--accent': tribe.accentColor } as CSSProperties;
  const stats = `${formatTaleCount(tribe.publishedStoryCount)} · ${formatReaderCount(
    tribe.subscriberCount,
  )}`;
  const cardClass = cn(styles.card, styles[variant], selected && styles.selected, className);

  if (onSelect) {
    return (
      <article className={cardClass} style={style}>
        <button
          type="button"
          className={styles.select}
          aria-pressed={selected}
          onClick={() => onSelect(tribe)}
        >
          <PublicationMark
            name={tribe.name}
            accentColor={tribe.accentColor}
            image={tribe.image}
            size="md"
          />
          <span className={styles.body}>
            <span className={styles.name}>{tribe.name}</span>
            {tribe.tagline ? <span className={styles.tagline}>{tribe.tagline}</span> : null}
            <span className={styles.stats}>{stats}</span>
          </span>
          <span className={cn(styles.check, selected && styles.checkActive)} aria-hidden="true">
            {selected ? <Check size={16} /> : null}
          </span>
        </button>
      </article>
    );
  }

  return (
    <article className={cardClass} style={style}>
      <Link to="/tribes/$slug" params={{ slug: tribe.slug }} className={styles.link}>
        <PublicationMark
          name={tribe.name}
          accentColor={tribe.accentColor}
          image={tribe.image}
          size={variant === 'rail' ? 'lg' : 'md'}
        />
        <span className={styles.body}>
          <span className={styles.name}>{tribe.name}</span>
          {tribe.tagline ? <span className={styles.tagline}>{tribe.tagline}</span> : null}
          <span className={styles.stats}>{stats}</span>
        </span>
      </Link>
      <div className={styles.follow}>
        <FollowButton tribe={tribe} />
      </div>
    </article>
  );
}
