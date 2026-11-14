import type { CategorySummary } from '@ubuntu-tales/shared';
import type { CSSProperties, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './Badge.module.css';

export type BadgeVariant = 'category' | 'neutral' | 'outline' | 'accent';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  /** Tribe accent passed as a CSS custom property, never a hard-coded colour. */
  accentColor?: string;
}

export function Badge({ children, variant = 'category', className, accentColor }: BadgeProps) {
  const style = accentColor
    ? ({ '--accent': accentColor } as CSSProperties)
    : undefined;

  return (
    <span className={cn(styles.badge, styles[variant], className)} style={style}>
      {children}
    </span>
  );
}

/** Category badge (e.g. "WISDOM TALE") from the API's category summary. */
export function CategoryBadge({
  category,
  className,
}: {
  category: Pick<CategorySummary, 'badge' | 'name'>;
  className?: string;
}) {
  return (
    <Badge variant="category" className={className}>
      {category.badge || category.name}
    </Badge>
  );
}
