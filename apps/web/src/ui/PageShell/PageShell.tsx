import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './PageShell.module.css';

export type PageShellVariant = 'feed' | 'publication' | 'reader' | 'narrow' | 'full';

export interface PageShellProps {
  children: ReactNode;
  variant?: PageShellVariant;
  className?: string;
}

/**
 * The page's single `<main>` landmark. Variants encode the three shells from the design doc:
 * feed (1120), publication (1120), reader (680), plus narrow and full-bleed for onboarding.
 */
export function PageShell({ children, variant = 'feed', className }: PageShellProps) {
  return (
    <main id="main" tabIndex={-1} className={cn(styles.shell, styles[variant], className)}>
      <div className={styles.inner}>{children}</div>
    </main>
  );
}
