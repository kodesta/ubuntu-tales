import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

import { clampPercent } from '../ProgressBar/ProgressBar';

import styles from './ReadingProgress.module.css';

export interface ReadingProgressProps {
  /** 0–100 percentage of the tale read. */
  value: number;
  accentColor?: string;
  label?: string;
  className?: string;
}

/** Fixed 2px progress hairline at the very top of the reader (tribe accent). */
export function ReadingProgress({
  value,
  accentColor,
  label = 'Reading progress',
  className,
}: ReadingProgressProps) {
  const percent = clampPercent(value);
  const style = { '--accent': accentColor ?? 'var(--terracotta)' } as CSSProperties;

  return (
    <div
      className={cn(styles.track, className)}
      style={style}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span className={styles.fill} style={{ width: `${percent}%` }} />
    </div>
  );
}
