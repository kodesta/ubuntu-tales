import type { AuthResponse } from '@ubuntu-tales/shared';

import { Dialog } from '@/ui';

import { useCompleteAuthentication } from './authCompletion';
import { useAuthModalStore } from './authModalStore';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

/**
 * The single AuthModal used by `requireAuth()` (brief item 1/5). Mounted once in the app shell;
 * it renders whichever form the gate asked for and, on success, resumes the reader's original
 * action — or lands them on the requested in-app path — before closing.
 */
export function AuthModalHost() {
  const mode = useAuthModalStore((state) => state.mode);
  const close = useAuthModalStore((state) => state.close);
  const switchMode = useAuthModalStore((state) => state.switchMode);
  const complete = useCompleteAuthentication();

  const handleSuccess = async (auth: AuthResponse) => {
    const activeMode = useAuthModalStore.getState().mode ?? 'login';
    const { action, redirectTo } = useAuthModalStore.getState().takePending();

    await complete(auth, {
      mode: activeMode,
      navigateTo: redirectTo,
      onComplete: action
        ? async () => {
            close();
            await action();
          }
        : undefined,
    });

    // No pending action: `complete` navigated (or the reader stays put); close the dialog.
    close();
  };

  return (
    <Dialog.Root
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      {mode !== null ? (
        <Dialog.Content
          title={mode === 'signup' ? 'Open your account.' : 'Welcome back.'}
          description={
            mode === 'signup'
              ? 'Reading stays free. An account keeps your place, your roots and your list on every device.'
              : 'Sign in to keep your reading list, your roots and your place in every tale.'
          }
          size="md"
        >
          {mode === 'signup' ? (
            <SignupForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => switchMode('login')}
            />
          ) : (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToSignup={() => switchMode('signup')}
            />
          )}
        </Dialog.Content>
      ) : null}
    </Dialog.Root>
  );
}
