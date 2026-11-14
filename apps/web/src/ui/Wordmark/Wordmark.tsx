import { cn } from '@/lib/cn';

import styles from './Wordmark.module.css';

export interface WordmarkProps {
  size?: 'sm' | 'md';
  className?: string;
}

/** "Ubuntu Tales" set in Lora with a small terracotta diamond. */
export function Wordmark({ size = 'md', className }: WordmarkProps) {
  return (
    <span className={cn(styles.wordmark, styles[size], className)}>
      Ubuntu Tales
      <span className={styles.diamond} aria-hidden="true">
        ◆
      </span>
    </span>
  );
}
