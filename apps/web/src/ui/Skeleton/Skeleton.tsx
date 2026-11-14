import { cn } from '@/lib/cn';

import styles from './Skeleton.module.css';

export type SkeletonVariant = 'text' | 'title' | 'row' | 'card' | 'hero' | 'mark' | 'rail';

export interface SkeletonProps {
  variant?: SkeletonVariant;
  lines?: number;
  className?: string;
}

function Lines({ count }: { count: number }) {
  return (
    <span className={styles.lines}>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={styles.line}
          style={{ width: index === count - 1 ? '62%' : '100%' }}
        />
      ))}
    </span>
  );
}

/** Paper-toned skeleton shapes; rows match the final row heights so first paint does not jump. */
export function Skeleton({ variant = 'text', lines = 3, className }: SkeletonProps) {
  switch (variant) {
    case 'title':
      return <span className={cn(styles.block, styles.title, className)} aria-hidden="true" />;
    case 'mark':
      return <span className={cn(styles.block, styles.mark, className)} aria-hidden="true" />;
    case 'row':
      return (
        <span className={cn(styles.row, className)} aria-hidden="true">
          <span className={styles.thumb} />
          <span className={styles.rowBody}>
            <Lines count={lines} />
          </span>
        </span>
      );
    case 'card':
      return (
        <span className={cn(styles.card, className)} aria-hidden="true">
          <span className={styles.cardCover} />
          <Lines count={lines} />
        </span>
      );
    case 'hero':
      return (
        <span className={cn(styles.hero, className)} aria-hidden="true">
          <span className={styles.heroCopy}>
            <Lines count={4} />
          </span>
          <span className={styles.heroCover} />
        </span>
      );
    case 'rail':
      return (
        <span className={cn(styles.rail, className)} aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index} className={styles.railItem}>
              <span className={styles.mark} />
              <Lines count={2} />
            </span>
          ))}
        </span>
      );
    case 'text':
    default:
      return (
        <span className={cn(styles.block, className)} aria-hidden="true">
          <Lines count={lines} />
        </span>
      );
  }
}
