import { Search, X } from 'lucide-react';
import { useId } from 'react';

import { cn } from '@/lib/cn';

import styles from './SearchField.module.css';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  className?: string;
}

/** Pill search input with icon, clear affordance and a real form for the search key. */
export function SearchField({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search tales, publications, feelings…',
  label = 'Search the archive',
  autoFocus = false,
  className,
}: SearchFieldProps) {
  const inputId = useId();

  return (
    <form
      role="search"
      className={cn(styles.form, className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
    >
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      <Search className={styles.icon} size={18} aria-hidden="true" />
      <input
        id={inputId}
        className={styles.input}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
      {value ? (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </form>
  );
}
