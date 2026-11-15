import type { ImageRef } from '@ubuntu-tales/shared';
import { useState, type CSSProperties } from 'react';

import { cn } from '@/lib/cn';
import { readableInkOn } from '@/lib/color';

import styles from './Avatar.module.css';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name: string;
  image?: ImageRef;
  accentColor?: string;
  size?: AvatarSize;
  className?: string;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? '◆';
  const second = words[1]?.charAt(0) ?? '';
  return (first + second).toUpperCase();
}

/** Narrator portrait, or a monogram in the narrator's accent when there is no image. */
export function Avatar({ name, image, accentColor, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(image) && !failed;
  const style = {
    '--accent': accentColor ?? 'var(--clay)',
    '--accent-ink': readableInkOn(accentColor),
  } as CSSProperties;

  return (
    <span className={cn(styles.avatar, styles[size], className)} style={style}>
      {showImage && image ? (
        <img
          className={styles.img}
          src={image.url}
          alt={image.alt ?? name}
          loading="lazy"
          decoding="async"
          width={image.width ?? 160}
          height={image.height ?? 160}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {initials(name)}
        </span>
      )}
    </span>
  );
}
