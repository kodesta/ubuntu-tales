import { Link, useNavigate } from '@tanstack/react-router';
import type { UserMe } from '@ubuntu-tales/shared';
import { useState, type FormEvent } from 'react';

import { interpretAuthError } from '@/features/auth/authErrors';
import { Field, FormError, PasswordInput } from '@/features/auth/fields';
import formStyles from '@/features/auth/form.module.css';
import { validateChangePassword } from '@/features/auth/validation';
import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { useFollowsStore } from '@/stores/follows';
import { useReactionsStore } from '@/stores/reactions';
import { useSavedStore } from '@/stores/saved';
import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { useTribeStore } from '@/stores/tribe';
import { Badge, Button, EmptyState, Masthead, PageShell, buttonClassName } from '@/ui';

import styles from './account.module.css';

/**
 * `/settings` — account details, password change, sign out everywhere, email verification,
 * on-device data explanation and the deferred preference placeholders (language/data saver stay
 * deliberately inert until their phases, per docs 03/06).
 */
export function SettingsPage() {
  useDocumentTitle('Settings — Ubuntu Tales');
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  if (!user) {
    return (
      <PageShell variant="narrow">
        <EmptyState
          eyebrow="Settings"
          title={status === 'unknown' ? 'Finding your place…' : 'This page is for account holders.'}
          body={
            status === 'unknown'
              ? 'One quiet moment while we restore your session.'
              : 'Reading stays free without an account. Sign in to manage your settings.'
          }
          action={
            status === 'guest' ? (
              <Link to="/login" search={{ redirect: '/settings' }} className={buttonClassName('primary')}>
                Sign in
              </Link>
            ) : null
          }
        />
      </PageShell>
    );
  }

  return <SettingsContent key={user.id} user={user} />;
}

function SettingsContent({ user }: { user: UserMe }) {
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.show);
  const logout = useSessionStore((state) => state.logout);
  const logoutAll = useSessionStore((state) => state.logoutAll);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string | undefined>>({});
  const [passwordFormError, setPasswordFormError] = useState('');
  const [passwordPending, setPasswordPending] = useState(false);

  const [resendPending, setResendPending] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateChangePassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setPasswordErrors(nextErrors);
    setPasswordFormError('');
    if (Object.values(nextErrors).some(Boolean)) return;

    setPasswordPending(true);
    try {
      await api.me.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Your password is changed.', { variant: 'success' });
    } catch (failure) {
      const parsed = interpretAuthError(failure, 'password');
      setPasswordErrors(parsed.fields);
      setPasswordFormError(parsed.message);
    } finally {
      setPasswordPending(false);
    }
  };

  const resendVerification = async () => {
    setResendPending(true);
    try {
      await api.auth.resendVerification();
      showToast('A new verification letter is on its way.', { variant: 'success' });
    } catch (failure) {
      const parsed = interpretAuthError(failure, 'verify');
      showToast(parsed.message || 'We could not send that letter just now.');
    } finally {
      setResendPending(false);
    }
  };

  const signOut = async () => {
    await logout();
    showToast('Signed out. Your place is kept.');
    void navigate({ href: '/' });
  };

  const signOutEverywhere = async () => {
    setSigningOutAll(true);
    try {
      await logoutAll();
      showToast('Signed out on every device.');
      void navigate({ href: '/' });
    } finally {
      setSigningOutAll(false);
    }
  };

  const clearOnDeviceData = () => {
    useSavedStore.getState().reset();
    useReadingProgressStore.getState().reset();
    useTribeStore.getState().clearTribe();
    useFollowsStore.getState().reset();
    useReactionsStore.getState().reset();
    setConfirmingClear(false);
    showToast('On-device reading data cleared.');
  };

  return (
    <PageShell variant="narrow">
      <Masthead
        eyebrow="Settings"
        title="Your account, in your hands."
        intro="Everything here is yours to change: your password, the devices that keep you signed in, and the data that lives on this one."
      />

      <div className={styles.main}>
        <section className={styles.card} aria-labelledby="settings-account">
          <div className={styles.cardHead}>
            <div>
              <p className={styles.eyebrow}>The essentials</p>
              <h2 id="settings-account" className={styles.cardTitle}>
                Account
              </h2>
            </div>
            <Link to="/profile" className={buttonClassName('secondary', 'sm')}>
              Edit details
            </Link>
          </div>

          <div className={styles.metaList}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Name</span>
              <span className={styles.metaValue}>{user.displayName}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Email</span>
              <span className={`${styles.metaValue} ${styles.metaValueWithBadge}`}>
                {user.email}{' '}
                {user.emailVerified ? (
                  <Badge variant="outline">Verified</Badge>
                ) : (
                  <Badge variant="neutral">Not verified</Badge>
                )}
              </span>
            </div>
          </div>
        </section>

        {!user.emailVerified ? (
          <section className={styles.card} aria-labelledby="settings-verify">
            <p className={styles.eyebrow}>One small task</p>
            <h2 id="settings-verify" className={styles.cardTitle}>
              Verify your email.
            </h2>
            <p className={styles.cardIntro}>
              A verified email keeps your account recoverable and your letters safe. We have sent
              one letter already; open it, or ask for another.
            </p>
            <div className={styles.actionsRow}>
              <Button variant="secondary" disabled={resendPending} onClick={() => void resendVerification()}>
                {resendPending ? 'Sending…' : 'Resend verification letter'}
              </Button>
              <Link to="/verify-email" className={formStyles.inlineLink}>
                I have the link
              </Link>
            </div>
          </section>
        ) : null}

        <section className={styles.card} aria-labelledby="settings-password">
          <p className={styles.eyebrow}>Keep it safe</p>
          <h2 id="settings-password" className={styles.cardTitle}>
            Change your password.
          </h2>
          <p className={styles.cardIntro}>
            At least ten characters. A line from a favourite tale is easy to remember and hard for
            anyone else to guess.
          </p>

          <form className={formStyles.form} onSubmit={changePassword} noValidate aria-busy={passwordPending}>
            <FormError message={passwordFormError} />

            <Field id="settings-current-password" label="Current password" error={passwordErrors.currentPassword}>
              {({ describedBy, invalid }) => (
                <PasswordInput
                  id="settings-current-password"
                  name="currentPassword"
                  autoComplete="current-password"
                  label="current password"
                  value={currentPassword}
                  disabled={passwordPending}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              )}
            </Field>

            <Field id="settings-new-password" label="New password" error={passwordErrors.newPassword}>
              {({ describedBy, invalid }) => (
                <PasswordInput
                  id="settings-new-password"
                  name="newPassword"
                  autoComplete="new-password"
                  label="new password"
                  value={newPassword}
                  disabled={passwordPending}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              )}
            </Field>

            <Field id="settings-confirm-password" label="Type it once more" error={passwordErrors.confirmPassword}>
              {({ describedBy, invalid }) => (
                <PasswordInput
                  id="settings-confirm-password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  label="password confirmation"
                  value={confirmPassword}
                  disabled={passwordPending}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              )}
            </Field>

            <div className={styles.actionsRow}>
              <Button type="submit" disabled={passwordPending}>
                {passwordPending ? 'Saving…' : 'Change password'}
              </Button>
            </div>
          </form>
        </section>

        <section className={styles.card} aria-labelledby="settings-sessions">
          <p className={styles.eyebrow}>Devices</p>
          <h2 id="settings-sessions" className={styles.cardTitle}>
            Signing in and out.
          </h2>
          <p className={styles.cardIntro}>
            Signing out everywhere revokes every device's session, including this one. You will need
            to sign in again on each.
          </p>
          <div className={styles.actionsRow}>
            <Button variant="secondary" onClick={() => void signOut()}>
              Sign out
            </Button>
            <Button variant="secondary" disabled={signingOutAll} onClick={() => void signOutEverywhere()}>
              {signingOutAll ? 'Signing out…' : 'Sign out everywhere'}
            </Button>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="settings-local">
          <p className={styles.eyebrow}>On this device</p>
          <h2 id="settings-local" className={styles.cardTitle}>
            Local reading data.
          </h2>
          <p className={styles.cardIntro}>
            Before accounts, some tales, reading positions, roots and reactions were kept in this
            browser only. Signing in moved your saved tales and place into your account; anything
            that could not be moved stays here. Clearing removes only what this device holds — your
            account is untouched.
          </p>
          {confirmingClear ? (
            <div className={styles.confirmBox}>
              <p className={styles.confirmText}>
                Clear saved tales, reading progress, roots, follows and reactions kept in this
                browser? This cannot be undone.
              </p>
              <div className={styles.actionsRow}>
                <Button variant="secondary" onClick={clearOnDeviceData}>
                  Yes, clear this device
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingClear(false)}>
                  Keep my data
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.actionsRow}>
              <Button variant="secondary" onClick={() => setConfirmingClear(true)}>
                Clear on-device data
              </Button>
            </div>
          )}
        </section>

        <section className={styles.card} aria-labelledby="settings-preferences">
          <p className={styles.eyebrow}>A later chapter</p>
          <h2 id="settings-preferences" className={styles.cardTitle}>
            Preferences.
          </h2>
          <p className={styles.cardIntro}>
            Language and data-saving travel with your account once the listening and offline
            chapters arrive. For now the reading app is English-only and streams nothing.
          </p>
          <div>
            <div className={styles.placeholderRow}>
              <div>
                <p className={styles.placeholderLabel}>Language</p>
                <p className={styles.placeholderHint}>More languages are being prepared.</p>
              </div>
              <span className={styles.disabledControl}>English (only for now)</span>
            </div>
            <div className={styles.placeholderRow}>
              <div>
                <p className={styles.placeholderLabel}>Data saver</p>
                <p className={styles.placeholderHint}>Arrives with narrations and downloads.</p>
              </div>
              <span className={styles.disabledControl}>Off</span>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="settings-privacy">
          <p className={styles.eyebrow}>Privacy</p>
          <h2 id="settings-privacy" className={styles.cardTitle}>
            What we send you.
          </h2>
          <p className={styles.cardIntro}>
            Only account letters — verification and password resets — for now. Marketing emails
            arrive later, and only if you ask for them. Your roots are optional, private and
            removable from your profile at any time.
          </p>
          <div className={styles.linkRow}>
            <Link to="/profile" className={formStyles.inlineLink}>
              Review your roots
            </Link>
            <Link to="/saved" className={formStyles.inlineLink}>
              Your reading list
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
