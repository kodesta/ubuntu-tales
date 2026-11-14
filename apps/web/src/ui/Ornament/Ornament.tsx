import { cn } from '@/lib/cn';

import styles from './Ornament.module.css';

/** Thin rule with a centred diamond — the end-of-tale breath. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn(styles.ornament, className)} aria-hidden="true">
      <span className={styles.line} />
      <span className={styles.diamond}>◆</span>
      <span className={styles.line} />
    </div>
  );
}
