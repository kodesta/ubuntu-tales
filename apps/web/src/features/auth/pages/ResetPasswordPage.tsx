import { Link, useSearch } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Button } from '@/ui';

import { interpretAuthError } from '../authErrors';
import { AuthPageLayout } from '../AuthPageLayout';
import { Field, FormError, PasswordInput } from '../fields';
import formStyles from '../form.module.css';
import {
  validateNewPassword,
  validatePasswordConfirmation,
  type FieldErrors,
} from '../validation';

/** `/reset-password?token=` — choose a new password; the API revokes every session on success. */
export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password — Ubuntu Tales');
  const { token } = useSearch({ from: '/reset-password' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const missingToken = !token;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    const nextErrors: FieldErrors = {
      newPassword: validateNewPassword(newPassword),
      confirmPassword: validatePasswordConfirmation(newPassword, confirmPassword),
    };
    setErrors(nextErrors);
    setFormError('');
    if (Object.values(nextErrors).some(Boolean)) return;

    setPending(true);
    try {
      await api.auth.resetPassword(token, newPassword);
      setDone(true);
    } catch (failure) {
      const parsed = interpretAuthError(failure, 'reset');
      setErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="A NEW KEY"
      title="Choose a new password."
      intro="Something you will remember, but hard for anyone else to guess. At least ten characters."
      assurances={[
        'A reset signs out every device, just in case.',
        'Your reading list and roots stay exactly as they were.',
        'You can change your password again any time in Settings.',
      ]}
      panelTitle={
        missingToken ? 'This link is missing its key' : done ? 'Your password is changed' : 'New password'
      }
      panelIntro={
        missingToken
          ? 'The reset link arrived incomplete. Ask for a fresh letter and try again.'
          : done
            ? 'You can now sign in with the new password. Every other device has been signed out.'
            : 'Choose a password of at least ten characters and type it twice.'
      }
    >
      {missingToken ? (
        <div className={formStyles.actions}>
          <Link to="/forgot-password" className={formStyles.inlineLink}>
            Ask for a new reset letter
          </Link>
          <Link to="/login" className={formStyles.inlineLink}>
            Back to sign in
          </Link>
        </div>
      ) : done ? (
        <div className={formStyles.actions}>
          <Link to="/login" className={formStyles.inlineLink}>
            Sign in with your new password
          </Link>
        </div>
      ) : (
        <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-busy={pending}>
          <FormError message={formError} />

          <Field id="reset-password" label="New password" error={errors.newPassword}>
            {({ describedBy, invalid }) => (
              <PasswordInput
                id="reset-password"
                name="newPassword"
                autoComplete="new-password"
                label="new password"
                value={newPassword}
                disabled={pending}
                aria-describedby={describedBy}
                invalid={invalid}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            )}
          </Field>

          <Field id="reset-confirm" label="Type it once more" error={errors.confirmPassword}>
            {({ describedBy, invalid }) => (
              <PasswordInput
                id="reset-confirm"
                name="confirmPassword"
                autoComplete="new-password"
                label="password confirmation"
                value={confirmPassword}
                disabled={pending}
                aria-describedby={describedBy}
                invalid={invalid}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            )}
          </Field>

          <div className={formStyles.actions}>
            <Button type="submit" fullWidth disabled={pending}>
              {pending ? 'Saving…' : 'Save my new password'}
            </Button>
            <Link to="/forgot-password" className={formStyles.inlineLink}>
              This link has expired — ask for a new one
            </Link>
          </div>
        </form>
      )}
    </AuthPageLayout>
  );
}
