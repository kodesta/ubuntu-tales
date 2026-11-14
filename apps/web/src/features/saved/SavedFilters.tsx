import type { SavedFilter } from '@ubuntu-tales/shared';

import { cn } from '@/lib/cn';

import { SAVED_FILTER_OPTIONS } from './savedFilters';
import styles from './SavedFilters.module.css';

export interface SavedFiltersProps {
  value: SavedFilter;
  onChange: (value: SavedFilter) => void;
  className?: string;
}

/**
 * Filter pills for the reading list. Mirrors the design-system `FilterPills` grammar but supports
 * a per-option disabled state, which the shared primitive does not expose yet (Offline is disabled
 * until downloads land).
 */
export function SavedFilters({ value, onChange, className }: SavedFiltersProps) {
  return (
    <div className={cn(styles.pills, className)} role="group" aria-label="Filter your reading list">
      {SAVED_FILTER_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(styles.pill, active && styles.active)}
            aria-pressed={active}
            disabled={option.disabled}
            title={option.note}
            onClick={() => {
              if (option.disabled) return;
              onChange(option.value);
            }}
          >
            {option.label}
            {option.disabled ? <span className={styles.hint}>soon</span> : null}
          </button>
        );
      })}
    </div>
  );
}
