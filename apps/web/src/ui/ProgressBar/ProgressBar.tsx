import type { CSSProperties } from 'react';

import { cn } from '@/lib/cn';

import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  /** 0–100. Values outside the range are clamped. */
  value: number;
  label?: string;
  accentColor?: string;
  size?: 'hairline' | 'normal';
  className?: string;
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Flat progress hairline used for reading and saved-tale progress. */
export function ProgressBar({
  value,
  label = 'Progress',
  accentColor,
  size = 'normal',
  className,
}: ProgressBarProps) {
  const percent = clampPercent(value);
  const style = { '--accent': accentColor ?? 'var(--terracotta)' } as CSSProperties;

  return (
    <div
      className={cn(styles.track, styles[size], className)}
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
