import { Check, Info, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import type { ToastItem } from '@/stores/toast';

import styles from './Toast.module.css';

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

/** Single confirmation toast, rendered by `<Toaster/>`. */
export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = toast.variant === 'success' ? Check : Info;

  return (
    <div className={cn(styles.toast, styles[toast.variant])}>
      <Icon className={styles.icon} size={16} aria-hidden="true" />
      <p className={styles.message}>{toast.message}</p>
      <button
        type="button"
        className={styles.dismiss}
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
