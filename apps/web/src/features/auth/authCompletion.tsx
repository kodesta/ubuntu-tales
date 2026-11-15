import { useNavigate } from '@tanstack/react-router';
import type { AuthResponse } from '@ubuntu-tales/shared';
import { useCallback } from 'react';

import { hydrateSavedFromApi, SAVED_QUERY_ROOT } from '@/features/saved/savedSync';
import { queryClient } from '@/lib/query-client';
import { useOnboardingStore } from '@/stores/onboarding';
import { useToastStore } from '@/stores/toast';

import { rememberDevEmailToken } from './dev';
import { describeGuestMerge, mergeGuestData } from './guestMerge';
import { firstNameOf, sanitizeRedirect } from './validation';

export interface CompleteAuthenticationOptions {
  mode: 'login' | 'signup';
  /**
   * App path to land on. Invalid/external values are dropped and an editorial default is used.
   * Ignored when `onComplete` is supplied.
   */
  navigateTo?: string | null;
  /** Modal path: run the reader's original action instead of navigating. */
  onComplete?: () => void | Promise<void>;
}

/**
 * The one place that finishes an authentication: move on-device guest state into the account,
 * welcome the reader, remember the DEV verification token, then navigate or resume the action.
 * Pages and the AuthModal both call this so the behaviour can never drift between them.
 */
export function useCompleteAuthentication(): (
  auth: AuthResponse,
  options: CompleteAuthenticationOptions,
) => Promise<void> {
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.show);

  return useCallback(
    async (auth: AuthResponse, options: CompleteAuthenticationOptions) => {
      try {
        const summary = await mergeGuestData(auth.user);
        const line = describeGuestMerge(summary);
        if (line) showToast(line);
      } catch {
        // Guest merge is a courtesy, never a blocker for a session that already exists.
      }

      // The session flips to authenticated before the merge finishes, so signed-in surfaces may
      // have cached an empty pre-merge list. Drop those caches and re-read the account state now
      // that every merged write has landed (otherwise guest saves look lost until a reload).
      await queryClient.invalidateQueries({ queryKey: SAVED_QUERY_ROOT });
      await hydrateSavedFromApi();
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['home'] });

      // A signed-in reader never needs the first-visit welcome again.
      useOnboardingStore.getState().complete();

      if (auth.devEmailToken) rememberDevEmailToken(auth.devEmailToken);

      const name = firstNameOf(auth.user.displayName);
      if (options.mode === 'signup') {
        showToast(
          auth.user.emailVerified
            ? `Welcome to Ubuntu Tales, ${name}.`
            : `Welcome to Ubuntu Tales, ${name}. Check your inbox to verify your email.`,
          { variant: 'success' },
        );
      } else {
        showToast(`Welcome back, ${name}.`, { variant: 'success' });
      }

      if (options.onComplete) {
        await options.onComplete();
        return;
      }

      const fallback =
        options.mode === 'signup' && !auth.user.emailVerified ? '/verify-email?sent=1' : '/';
      navigate({ href: sanitizeRedirect(options.navigateTo) ?? fallback, replace: true });
    },
    [navigate, showToast],
  );
}
