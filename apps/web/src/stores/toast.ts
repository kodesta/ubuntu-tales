import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, options?: { variant?: ToastVariant; durationMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;

function nextId(): string {
  counter += 1;
  return `toast-${counter}`;
}

/** Ephemeral confirmation toasts (saved/unsaved/followed/copied). Not persisted. */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (message, options = {}) => {
    const id = nextId();
    const item: ToastItem = {
      id,
      message,
      variant: options.variant ?? 'default',
      durationMs: options.durationMs ?? 5000,
    };
    set((state) => ({ toasts: [...state.toasts.slice(-2), item] }));
    return id;
  },
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

/** Convenience used by local-only actions so the copy stays consistent. */
export const ON_DEVICE_NOTE = 'Saved on this device — accounts are coming soon.';
export const FOLLOW_DEVICE_NOTE = 'Following on this device — accounts are coming soon.';
export function toastOnDevice(note = ON_DEVICE_NOTE): void {
  useToastStore.getState().show(note);
}
