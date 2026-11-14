import { create } from 'zustand';

/**
 * Auth modal state, kept in the auth feature (not the chrome store) so the reusable
 * `requireAuth()` helper can open it from plain event handlers without a React hook.
 * `pendingAction` is the reader's original intent — it resumes after a successful sign-in.
 */
export type AuthMode = 'login' | 'signup';

export interface OpenAuthModalOptions {
  mode?: AuthMode;
  /** Re-runs after login/signup so the action the reader started completes. */
  action?: () => void | Promise<void>;
  /** In-app path to land on when there is no action (sanitised by the caller). */
  redirectTo?: string | null;
}

interface AuthModalState {
  mode: AuthMode | null;
  pendingAction: (() => void | Promise<void>) | null;
  redirectTo: string | null;
  open: (options?: OpenAuthModalOptions) => void;
  close: () => void;
  switchMode: (mode: AuthMode) => void;
  /** Called by the modal after a successful authentication: clears state, returns what to run. */
  takePending: () => {
    action: (() => void | Promise<void>) | null;
    redirectTo: string | null;
  };
}

export const useAuthModalStore = create<AuthModalState>()((set, get) => ({
  mode: null,
  pendingAction: null,
  redirectTo: null,

  open: (options = {}) =>
    set({
      mode: options.mode ?? 'login',
      pendingAction: options.action ?? null,
      redirectTo: options.redirectTo ?? null,
    }),

  close: () => set({ mode: null, pendingAction: null, redirectTo: null }),

  switchMode: (mode) => set({ mode }),

  takePending: () => {
    const { pendingAction, redirectTo } = get();
    return { action: pendingAction, redirectTo };
  },
}));
