import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { Button, buttonClassName } from '@/ui';

import { interpretAuthError } from '../authErrors';
import { AuthPageLayout } from '../AuthPageLayout';
import { clearDevEmailToken, isDevEnvironment, peekDevEmailToken } from '../dev';
import formStyles from '../form.module.css';

type VerifyState = 'idle' | 'verifying' | 'success' | 'error';

/**
 * `/verify-email` — consumes `?token=` from the email link (once), with resend for signed-in
 * readers and a DEV-only shortcut for the token the API returns outside production.
 */
export function VerifyEmailPage() {
  useDocumentTitle('Verify your email — Ubuntu Tales');
  const { token, sent } = useSearch({ from: '/verify-email' });
  const wasSent = Boolean(sent);
  const status = useSessionStore((state) => state.status);
  const updateUser = useSessionStore((state) => state.updateUser);
  const showToast = useToastStore((state) => state.show);
  const navigate = useNavigate();

  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState('');
  const [expired, setExpired] = useState(false);
  const [resending, setResending] = useState(false);
  const attempted = useRef(false);

  const devToken = isDevEnvironment() ? peekDevEmailToken() : null;
  const authenticated = status === 'authenticated';

  useEffect(() => {
    if (!token || attempted.current) return;
    attempted.current = true;

    let cancelled = false;
    void (async () => {
      setState('verifying');
      setMessage('');
      try {
        const response = await api.auth.verifyEmail(token);
        if (cancelled) return;
        if (useSessionStore.getState().status === 'authenticated') {
          updateUser(response.user);
        }
        clearDevEmailToken();
        setState('success');
        showToast('Your email is verified.', { variant: 'success' });
      } catch (error) {
        if (cancelled) return;
        const parsed = interpretAuthError(error, 'verify');
        setExpired(parsed.code === 'AUTH_TOKEN_EXPIRED');
        setMessage(parsed.message || 'That verification link could not be used.');
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, updateUser, showToast]);

  const verifyWithDevToken = async (value: string) => {
    setState('verifying');
    setMessage('');
    try {
      const response = await api.auth.verifyEmail(value);
      if (useSessionStore.getState().status === 'authenticated') updateUser(response.user);
      clearDevEmailToken();
      setState('success');
      showToast('Your email is verified.', { variant: 'success' });
    } catch (error) {
      const parsed = interpretAuthError(error, 'verify');
      setExpired(parsed.code === 'AUTH_TOKEN_EXPIRED');
      setMessage(parsed.message || 'That verification link could not be used.');
      setState('error');
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api.auth.resendVerification();
      showToast('A new verification letter is on its way.', { variant: 'success' });
    } catch (error) {
      const parsed = interpretAuthError(error, 'verify');
      showToast(parsed.message || 'We could not send that letter just now.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="A LETTER FOR YOU"
      title="Verify your email."
      intro="Verification keeps your account and your letters safe. Open the link in our email and your account is complete."
      assurances={[
        'The link works once, then retires itself.',
        'You can keep reading while you wait.',
        'Your email is never shown to other readers.',
      ]}
      panelTitle={
        state === 'success'
          ? 'Your email is verified'
          : state === 'error'
            ? expired
              ? 'That letter has expired'
              : 'We could not verify that letter'
            : state === 'verifying'
              ? 'Verifying…'
              : 'Check your inbox'
      }
      panelIntro={
        state === 'success'
          ? 'Your letters will reach you now. Thank you for keeping your account safe.'
          : state === 'error'
            ? message
            : state === 'verifying'
              ? 'One quiet moment while we read the letter.'
              : wasSent
                ? 'We have sent a verification letter to your email address.'
                : 'Open the link in your verification email to finish setting up your account.'
      }
    >
      {state === 'success' ? (
        <div className={formStyles.actions}>
          <Button fullWidth onClick={() => void navigate({ href: '/' })}>
            Continue reading
          </Button>
          <Link to="/profile" className={buttonClassName('secondary', 'md', true)}>
            Your account
          </Link>
        </div>
      ) : null}

      {state === 'error' && !authenticated ? (
        <Link to="/forgot-password" className={formStyles.inlineLink}>
          Forgotten your password instead?
        </Link>
      ) : null}

      {state === 'idle' && !wasSent ? (
        <p className={formStyles.hint}>
          No link yet? {authenticated ? 'Ask for another letter below.' : 'Sign in and ask us to resend it.'}
        </p>
      ) : null}

      {state !== 'success' && state !== 'verifying' ? (
        <div className={formStyles.actions}>
          {authenticated ? (
            <Button variant="secondary" fullWidth disabled={resending} onClick={() => void resend()}>
              {resending ? 'Sending…' : 'Resend verification letter'}
            </Button>
          ) : (
            <Link
              to="/login"
              search={{ redirect: '/verify-email' }}
              className={buttonClassName('secondary', 'md', true)}
            >
              Sign in to resend
            </Link>
          )}
        </div>
      ) : null}

      {isDevEnvironment() && devToken && state !== 'success' ? (
        <div className={formStyles.devPanel}>
          <p className={formStyles.devTitle}>DEV · verification token from the API</p>
          <Button variant="secondary" size="sm" onClick={() => void verifyWithDevToken(devToken)}>
            Verify with DEV token
          </Button>
        </div>
      ) : null}
    </AuthPageLayout>
  );
}
