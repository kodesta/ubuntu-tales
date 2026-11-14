import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

import styles from './IconButton.module.css';

export type IconButtonVariant = 'ghost' | 'paper' | 'solid';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Accessible name — icon-only buttons must always carry one. */
  label: string;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(styles.iconButton, styles[variant], styles[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
