import { Children, Fragment, type ElementType, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './Meta.module.css';

export interface MetaProps {
  children: ReactNode;
  /** Rendered element; defaults to a paragraph so it stays meaningful in article markup. */
  as?: ElementType;
  size?: 'meta' | 'micro' | 'eyebrow';
  tone?: 'muted' | 'soft' | 'faint';
  separator?: string;
  className?: string;
}

/**
 * Uppercase-optional label row with editorial middot separators. Empty/false children are skipped
 * so callers can inline conditionals.
 */
export function Meta({
  children,
  as: Tag = 'p',
  size = 'meta',
  tone = 'muted',
  separator = '·',
  className,
}: MetaProps) {
  // React.Children.toArray drops null/undefined/booleans for us; keep empty strings out too.
  const items = Children.toArray(children).filter((child) => child !== '');

  return (
    <Tag className={cn(styles.meta, styles[size], styles[tone], className)}>
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <span className={styles.separator} aria-hidden="true">
              {separator}
            </span>
          ) : null}
          <span className={styles.item}>{item}</span>
        </Fragment>
      ))}
    </Tag>
  );
}
