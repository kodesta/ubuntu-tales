import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './Masthead.module.css';

export interface MastheadProps {
  title: ReactNode;
  eyebrow?: string;
  intro?: ReactNode;
  actions?: ReactNode;
  titleSize?: 'h1' | 'display';
  className?: string;
}

/** Editorial page masthead: eyebrow, one h1, an intro and optional actions. */
export function Masthead({
  title,
  eyebrow,
  intro,
  actions,
  titleSize = 'h1',
  className,
}: MastheadProps) {
  return (
    <header className={cn(styles.masthead, className)}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={cn(styles.title, styles[titleSize])}>{title}</h1>
      {intro ? <p className={styles.intro}>{intro}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
