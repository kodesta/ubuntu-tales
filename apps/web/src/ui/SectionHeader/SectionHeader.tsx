import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './SectionHeader.module.css';

export interface SectionHeaderProps {
  title: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

/** Editorial section head: eyebrow, Lora title and a quiet right-hand action. */
export function SectionHeader({ title, eyebrow, action, className }: SectionHeaderProps) {
  return (
    <div className={cn(styles.header, className)}>
      <div className={styles.text}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h2 className={styles.title}>{title}</h2>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
