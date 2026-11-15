import type { ImageRef } from '@ubuntu-tales/shared';
import { useState, type CSSProperties } from 'react';

import { cn } from '@/lib/cn';

import styles from './Image.module.css';

export type ImageRatio = '3/2' | '16/10' | '4/3' | '1/1' | '2/3';

export interface ImageProps {
  image: ImageRef;
  ratio?: ImageRatio;
  className?: string;
  /** Decorative covers get an empty alt; editorial covers keep the API's alt text. */
  decorative?: boolean;
  loading?: 'lazy' | 'eager';
  sizes?: string;
}

/**
 * Fixed-aspect cover frame: no layout shift, paper placeholder while loading and a quiet geometric
 * fallback if artwork has not landed yet (covers are authored in parallel in Phase 1).
 */
export function Image({
  image,
  ratio = '3/2',
  className,
  decorative = false,
  loading = 'lazy',
  sizes,
}: ImageProps) {
  const [failed, setFailed] = useState(false);
  const style = { '--ratio': ratio } as CSSProperties;

  return (
    <span className={cn(styles.frame, className)} style={style}>
      {failed ? (
        <span className={styles.fallback} aria-hidden="true">
          ◆
        </span>
      ) : (
        <img
          className={styles.img}
          src={image.url}
          srcSet={image.srcset}
          sizes={sizes}
          width={image.width ?? 1200}
          height={image.height ?? 800}
          alt={decorative ? '' : (image.alt ?? '')}
          loading={loading}
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
