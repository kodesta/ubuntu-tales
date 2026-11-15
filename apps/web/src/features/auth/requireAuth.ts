import { useCallback } from 'react';

import { useSessionStore } from '@/stores/session';

import { useAuthModalStore } from './authModalStore';

/**
 * Reusable auth gate (brief item 5; used by web-personal for gated surfaces).
 *
 * `requireAuth(action)` runs straight away for a signed-in reader, waits out a session boot and
 * re-checks, or opens the AuthModal and resumes `action` after a successful sign-in/sign-up.
 * It is safe to call from a native event handler — no hook required — and deliberately returns
 * `false` when the action was deferred, so callers can skip optimistic UI.
 */

export type AuthAction = () => void | Promise<void>;

export interface RequireAuthOptions {
  /** Which form to open: sign in (default) or open an account. */
  mode?: 'login' | 'signup';
  /** In-app path to land on when the modal finishes without a pending action. */
  redirectTo?: string | null;
}

function runAction(action?: AuthAction): void {
  if (!action) return;
  try {
    const result = action();
    // Actions are caller-owned; a rejection must not become an unhandled promise from here.
    void Promise.resolve(result).catch(() => undefined);
  } catch {
    // A synchronous throw in the resumed action is the caller's to surface.
  }
}

function openModal(action: AuthAction | undefined, options: RequireAuthOptions): void {
  useAuthModalStore.getState().open({
    mode: options.mode ?? 'login',
    action,
    redirectTo: options.redirectTo ?? null,
  });
}

export function requireAuth(action?: AuthAction, options: RequireAuthOptions = {}): boolean {
  const { status } = useSessionStore.getState();

  if (status === 'authenticated') {
    runAction(action);
    return true;
  }

  if (status === 'unknown') {
    // Boot is in flight (a page reload restoring the session). Decide once it settles.
    void useSessionStore
      .getState()
      .boot()
      .then(() => {
        if (useSessionStore.getState().status === 'authenticated') runAction(action);
        else openModal(action, options);
      });
    return false;
  }

  openModal(action, options);
  return false;
}

/** Hook flavour for components that prefer a stable callback. */
export function useRequireAuth(): (
  action?: AuthAction,
  options?: RequireAuthOptions,
) => boolean {
  return useCallback(
    (action?: AuthAction, options?: RequireAuthOptions) => requireAuth(action, options),
    [],
  );
}
