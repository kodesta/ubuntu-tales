import { cn } from '@/lib/cn';
import { FONT_SIZES, FONT_SIZE_LABELS, useFontSizeStore } from '@/stores/fontSize';
import { IconButton } from '@/ui';

import styles from './FontSizeControl.module.css';

export interface FontSizeControlProps {
  className?: string;
}

/**
 * `A− / A+` reading-density control wired to the shared, persisted font-size store
 * (`ut.fontSize`). Stepping is clamped at the ends; the current label is announced politely.
 */
export function FontSizeControl({ className }: FontSizeControlProps) {
  const size = useFontSizeStore((state) => state.size);
  const cycle = useFontSizeStore((state) => state.cycle);
  const index = FONT_SIZES.indexOf(size);

  return (
    <div className={cn(styles.control, className)} role="group" aria-label="Reading text size">
      <IconButton
        label="A− Decrease text size"
        size="sm"
        variant="ghost"
        disabled={index <= 0}
        onClick={() => cycle(-1)}
      >
        <span className={styles.small} aria-hidden="true">
          A−
        </span>
      </IconButton>
      <IconButton
        label="A+ Increase text size"
        size="sm"
        variant="ghost"
        disabled={index >= FONT_SIZES.length - 1}
        onClick={() => cycle(1)}
      >
        <span className={styles.large} aria-hidden="true">
          A+
        </span>
      </IconButton>
      <span className="sr-only" aria-live="polite">
        Text size: {FONT_SIZE_LABELS[size]}
      </span>
    </div>
  );
}
