import { createElement, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  variant?: 'default' | 'error';
  /** Use level 1 when the empty state is the whole page (404, route error, placeholders). */
  headingLevel?: 1 | 2 | 3;
  className?: string;
}

/** Quiet, illustration-less empty/error state in editorial voice. */
export function EmptyState({
  eyebrow,
  title,
  body,
  action,
  variant = 'default',
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(styles.empty, variant === 'error' && styles.error, className)}
      role={variant === 'error' ? 'alert' : undefined}
    >
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      {createElement(`h${headingLevel}`, { className: styles.title }, title)}
      {body ? <p className={styles.body}>{body}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
