import { cn } from '@/lib/cn';

import styles from './FilterPills.module.css';

export interface FilterPillOption {
  value: string;
  label: string;
}

export interface FilterPillsProps {
  options: FilterPillOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible group name, e.g. "Filter by region". */
  label: string;
  className?: string;
}

/** Horizontally scrollable editorial filter pills (regions, categories, saved filters). */
export function FilterPills({ options, value, onChange, label, className }: FilterPillsProps) {
  return (
    <div className={cn(styles.pills, className)} role="group" aria-label={label}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(styles.pill, active && styles.active)}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
