import { Link } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';

import { api } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Button } from '@/ui';

import { interpretAuthError } from '../authErrors';
import { AuthPageLayout } from '../AuthPageLayout';
import { isDevEnvironment } from '../dev';
import { Field, FormError, FormSuccess, TextInput } from '../fields';
import formStyles from '../form.module.css';
import { normaliseEmail, validateEmail } from '../validation';

/**
 * `/forgot-password` — always answers with the same calm sentence so the screen cannot be used
 * to discover which emails have accounts (the API also returns 202 unconditionally).
 */
export function ForgotPasswordPage() {
  useDocumentTitle('Forgotten password — Ubuntu Tales');
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = validateEmail(email);
    setFieldError(error);
    setFormError('');
    if (error) return;

    setPending(true);
    try {
      const response = await api.auth.forgotPassword(normaliseEmail(email));
      setSent(true);
      setDevResetToken(isDevEnvironment() ? (response.devResetToken ?? null) : null);
    } catch (failure) {
      const parsed = interpretAuthError(failure, 'forgot');
      setFieldError(parsed.fields.email);
      setFormError(parsed.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthPageLayout
      eyebrow="A WAY BACK IN"
      title="Find your way back."
      intro="Give us the email you joined with and we will send a letter with a link to choose a new password."
      assurances={[
        'Reset links work once, then retire themselves.',
        'We never say whether an email has an account.',
        'Your reading list waits exactly where it was.',
      ]}
      panelTitle={sent ? 'Check your inbox' : 'Forgotten password'}
      panelIntro={
        sent
          ? 'If an account exists for that address, a reset letter is on its way. It may take a minute.'
          : 'We will send a single-use link to choose a new password.'
      }
    >
      {sent ? (
        <div className={formStyles.actions}>
          <FormSuccess message="Reset letter sent." />
          <p className={formStyles.hint}>
            Nothing arrived after a few minutes? Look in the spam folder, or try another address.
          </p>
          {devResetToken ? (
            <div className={formStyles.devPanel}>
              <p className={formStyles.devTitle}>DEV · reset token from the API</p>
              <Link
                to="/reset-password"
                search={{ token: devResetToken }}
                className={formStyles.inlineLink}
              >
                Open the reset link now
              </Link>
            </div>
          ) : null}
          <Button variant="secondary" fullWidth onClick={() => setSent(false)}>
            Use a different email
          </Button>
          <Link to="/login" className={formStyles.inlineLink}>
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-busy={pending}>
          <FormError message={formError} />

          <Field id="forgot-email" label="Email" error={fieldError}>
            {({ describedBy, invalid }) => (
              <TextInput
                id="forgot-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                value={email}
                disabled={pending}
                aria-describedby={describedBy}
                invalid={invalid}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>

          <div className={formStyles.actions}>
            <Button type="submit" fullWidth disabled={pending}>
              {pending ? 'Sending…' : 'Send the reset letter'}
            </Button>
            <Link to="/login" className={formStyles.inlineLink}>
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthPageLayout>
  );
}
