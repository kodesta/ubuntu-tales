import { Link } from '@tanstack/react-router';
import type { AuthResponse, LoginInput } from '@ubuntu-tales/shared';
import { useState, type FormEvent } from 'react';

import { useSessionStore } from '@/stores/session';
import { Button } from '@/ui';

import { interpretAuthError } from './authErrors';
import { DEV_SEED_USERS, DEV_SEED_PASSWORD, isDevEnvironment } from './dev';
import {
  Field,
  FormError,
  PasswordInput,
  TextInput,
} from './fields';
import styles from './form.module.css';
import {
  normaliseEmail,
  validateLogin,
  type FieldErrors,
} from './validation';

export interface LoginFormProps {
  /** Called once the session is stored — the page/modal finishes the flow (merge, toast, redirect). */
  onSuccess?: (auth: AuthResponse) => void | Promise<void>;
  /** Modal-only: switch to the signup form in place. */
  onSwitchToSignup?: () => void;
  /** Preserved so the signup link keeps the post-auth destination. */
  redirectTo?: string | null;
  /** Prefilled by quick links (e.g. "sign in to save" from an email). */
  initialEmail?: string;
}

/**
 * Email + password sign-in. Validation mirrors the API; server errors are mapped through
 * `interpretAuthError` so a wrong password produces one calm sentence rather than field noise.
 * In DEV the seeded accounts get one-click chips (guarded by `import.meta.env.DEV`).
 */
export function LoginForm({
  onSuccess,
  onSwitchToSignup,
  redirectTo,
  initialEmail,
}: LoginFormProps) {
  const login = useSessionStore((state) => state.login);
  const [email, setEmail] = useState(initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const signIn = async (credentials: LoginInput) => {
    const values = {
      email: credentials.email,
      password: credentials.password,
    };
    const nextErrors = validateLogin(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const auth = await login({ email: normaliseEmail(values.email), password: values.password });
      await onSuccess?.(auth);
    } catch (error) {
      const parsed = interpretAuthError(error, 'login');
      setErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void signIn({ email, password });
  };

  const signupSearch = redirectTo ? { redirect: redirectTo } : undefined;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <FormError message={formError} />

      <Field id="login-email" label="Email" error={errors.email}>
        {({ describedBy, invalid }) => (
          <TextInput
            id="login-email"
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

      <Field id="login-password" label="Password" error={errors.password}>
        {({ describedBy, invalid }) => (
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            label="password"
            value={password}
            disabled={pending}
            aria-describedby={describedBy}
            invalid={invalid}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <div className={styles.asideRow}>
        <Link to="/forgot-password" className={styles.inlineLink}>
          Forgot your password?
        </Link>
      </div>

      <div className={styles.actions}>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>

      <p className={styles.divider}>or</p>

      <p className={styles.switchRow}>
        {onSwitchToSignup ? (
          <>
            New to the fire?{' '}
            <button type="button" onClick={onSwitchToSignup} disabled={pending}>
              Open an account
            </button>
          </>
        ) : (
          <>
            New to the fire?{' '}
            <Link to="/signup" search={signupSearch} className={styles.inlineLink}>
              Open an account
            </Link>
          </>
        )}
      </p>

      {isDevEnvironment() && DEV_SEED_USERS.length > 0 ? (
        <div className={styles.devPanel}>
          <p className={styles.devTitle}>DEV · Seeded readers — one click</p>
          <div className={styles.devChips}>
            {DEV_SEED_USERS.map((user) => (
              <button
                key={user.email}
                type="button"
                className={styles.devChip}
                disabled={pending}
                title={user.email}
                onClick={() => void signIn({ email: user.email, password: DEV_SEED_PASSWORD })}
              >
                {user.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
