import { Eye, EyeOff } from 'lucide-react';
import {
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

import styles from './form.module.css';

/** Accessibility wiring handed to the control by `<Field>` (label/description/error ids). */
export interface FieldControlIds {
  describedBy?: string;
  invalid: boolean;
}

export interface FieldProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (ids: FieldControlIds) => ReactNode;
}

/**
 * Label + control + hint + inline error. The error is announced through `aria-describedby`
 * (never colour alone) and `aria-invalid` is set on the control.
 */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);

  return (
    <div className={cn(styles.field, className)}>
      <label htmlFor={id} className={styles.label}>
        <span>{label}</span>
        {optional ? <span className={styles.optional}>Optional</span> : null}
      </label>
      {children({ describedBy, invalid })}
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ invalid, className, ...rest }: TextInputProps) {
  return (
    <input
      {...rest}
      className={cn(styles.input, invalid && styles.inputInvalid, className)}
      aria-invalid={invalid || undefined}
    />
  );
}

export interface PasswordInputProps extends Omit<TextInputProps, 'type'> {
  /** Accessible label for the reveal toggle, e.g. "password". */
  label?: string;
}

/** Password field with a keyboard-reachable reveal toggle (aria-pressed + explicit label). */
export function PasswordInput({ invalid, className, label = 'password', ...rest }: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <span className={styles.passwordWrap}>
      <TextInput
        {...rest}
        type={revealed ? 'text' : 'password'}
        invalid={invalid}
        className={className}
      />
      <button
        type="button"
        className={styles.passwordToggle}
        aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
        aria-pressed={revealed}
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </span>
  );
}

export interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function SelectInput({ invalid, className, children, ...rest }: SelectInputProps) {
  return (
    <select
      {...rest}
      className={cn(styles.select, invalid && styles.inputInvalid, className)}
      aria-invalid={invalid || undefined}
    >
      {children}
    </select>
  );
}

export interface CheckboxFieldProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  hint?: ReactNode;
  error?: string;
  disabled?: boolean;
}

/** Checkbox with a multi-line editorial label (consents need room to be read). */
export function CheckboxField({
  id,
  checked,
  onChange,
  children,
  hint,
  error,
  disabled,
}: CheckboxFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.checkboxRow}>
      <input
        id={id}
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.checked)}
      />
      <div className={styles.field}>
        <label htmlFor={id} className={styles.checkboxLabel}>
          {children}
        </label>
        {hint ? (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Shared form-level error banner (server or validation summary). */
export function FormError({ message }: { message: string | undefined | null }) {
  if (!message) return null;
  return (
    <p className={styles.formError} role="alert">
      {message}
    </p>
  );
}

/** Shared form-level success banner (password reset, verification, …). */
export function FormSuccess({ message }: { message: string | undefined | null }) {
  if (!message) return null;
  return (
    <p className={styles.formSuccess} role="status">
      {message}
    </p>
  );
}

/** Generates stable ids for forms that render more than one of the same control. */
export function useFieldId(prefix: string): string {
  const id = useId();
  return `${prefix}-${id.replace(/[:]/g, '')}`;
}
