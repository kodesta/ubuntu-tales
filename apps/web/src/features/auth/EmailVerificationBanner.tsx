import { Link, useRouterState } from '@tanstack/react-router';
import { MailWarning, X } from 'lucide-react';
import { useState } from 'react';

import { api } from '@/lib/api';
import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';

import { interpretAuthError } from './authErrors';
import styles from './EmailVerificationBanner.module.css';

const HIDDEN_PATHS = ['/verify-email', '/login', '/signup'];

/**
 * A quiet editorial band for signed-in readers whose email is not verified yet (brief item 2:
 * "email-verified banner/toast where relevant"). Resend uses the authenticated endpoint and
 * dismisses for the current page view — never nagging across reloads.
 */
export function EmailVerificationBanner() {
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const showToast = useToastStore((state) => state.show);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);

  if (status !== 'authenticated' || !user || user.emailVerified || dismissed) return null;
  if (HIDDEN_PATHS.some((path) => pathname.startsWith(path))) return null;

  const resend = async () => {
    setPending(true);
    try {
      await api.auth.resendVerification();
      showToast('A new verification letter is on its way.', { variant: 'success' });
    } catch (error) {
      const parsed = interpretAuthError(error, 'verify');
      showToast(parsed.message || 'We could not send that letter just now.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.banner}>
      <div className={styles.inner}>
        <MailWarning size={18} aria-hidden="true" className={styles.icon} />
        <p className={styles.text}>
          Your email is not verified yet. Verify it so your account and letters stay safe.{' '}
          <Link to="/verify-email" className={styles.link}>
            Verify email
          </Link>
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.resend}
            disabled={pending}
            onClick={() => void resend()}
          >
            {pending ? 'Sending…' : 'Resend letter'}
          </button>
          <button
            type="button"
            className={styles.dismiss}
            aria-label="Dismiss verification reminder"
            onClick={() => setDismissed(true)}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
