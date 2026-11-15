import { cn } from '@/lib/cn';

import styles from './Rule.module.css';

export interface RuleProps {
  variant?: 'hairline' | 'strong';
  className?: string;
}

/** Flat hairline divider — the workhorse of the editorial layout. */
export function Rule({ variant = 'hairline', className }: RuleProps) {
  return <hr className={cn(styles.rule, styles[variant], className)} />;
}
