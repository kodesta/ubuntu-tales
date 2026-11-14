import type { ImageRef } from '@ubuntu-tales/shared';
import { useState, type CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { readableInkOn } from '@/lib/color';

import styles from './PublicationMark.module.css';

export type PublicationMarkSize = 'sm' | 'md' | 'lg' | 'xl';

export interface PublicationMarkProps {
  name: string;
  accentColor?: string;
  image?: ImageRef;
  size?: PublicationMarkSize;
  shape?: 'square' | 'circle';
  className?: string;
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '◆';
  return first.toUpperCase();
}

/** A publication is recognised by its cover mark, or by an accent monogram until art exists. */
export function PublicationMark({
  name,
  accentColor,
  image,
  size = 'md',
  shape = 'square',
  className,
}: PublicationMarkProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;
  const style = {
    '--accent': accentColor ?? 'var(--terracotta)',
    '--accent-ink': readableInkOn(accentColor),
  } as CSSProperties;

  return (
    <span
      className={cn(
        styles.mark,
        styles[size],
        shape === 'circle' && styles.circle,
        className,
      )}
      style={style}
    >
      {showImage && image ? (
        <img
          className={styles.img}
          src={image.url}
          alt={image.alt ?? `${name} publication mark`}
          loading="lazy"
          decoding="async"
          width={image.width ?? 600}
          height={image.height ?? 600}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.monogram} aria-hidden="true">
          {monogram(name)}
        </span>
      )}
    </span>
  );
}
