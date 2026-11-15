import { Link } from '@tanstack/react-router';
import type { AuthResponse, CommunityRole, RegisterInput } from '@ubuntu-tales/shared';
import { useState, type FormEvent } from 'react';

import { usePublicConfig, useTribes } from '@/lib/queries';
import { useSessionStore } from '@/stores/session';
import { Button } from '@/ui';

import { interpretAuthError } from './authErrors';
import { FALLBACK_COMMUNITY_ROLES } from './communityRoles';
import {
  CheckboxField,
  Field,
  FormError,
  PasswordInput,
  SelectInput,
  TextInput,
} from './fields';
import styles from './form.module.css';
import {
  normaliseEmail,
  validateSignup,
  type FieldErrors,
  type SignupValues,
} from './validation';

export interface SignupFormProps {
  onSuccess?: (auth: AuthResponse) => void | Promise<void>;
  onSwitchToLogin?: () => void;
  redirectTo?: string | null;
}

/**
 * The editorial signup form. Roots/lineage are optional and only sent with explicit consent
 * (docs 08 §3); age, terms and privacy confirmations are required. The submitted payload mirrors
 * `RegisterInput` exactly, so the API contract stays the single source of truth.
 */
export function SignupForm({ onSuccess, onSwitchToLogin, redirectTo }: SignupFormProps) {
  const register = useSessionStore((state) => state.register);
  const tribesQuery = useTribes();
  const configQuery = usePublicConfig();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shareRoots, setShareRoots] = useState(false);
  const [tribeId, setTribeId] = useState('');
  const [customLineage, setCustomLineage] = useState('');
  const [communityRole, setCommunityRole] = useState('');
  const [confirmAge13Plus, setConfirmAge13Plus] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const roles = configQuery.data?.communityRoles?.length
    ? configQuery.data.communityRoles.map((role) => ({ value: role.value, label: role.label }))
    : FALLBACK_COMMUNITY_ROLES;

  const values: SignupValues = {
    displayName,
    email,
    password,
    tribeId: shareRoots ? tribeId || undefined : undefined,
    customLineage: shareRoots ? customLineage : undefined,
    communityRole: communityRole || undefined,
    shareRoots,
    acceptTerms,
    acceptPrivacy,
    confirmAge13Plus,
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateSignup(values);
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;

    const lineage = shareRoots ? customLineage.trim() : '';
    // At most one of tribeId / customLineage: a hand-written lineage wins over the publication.
    const chosenTribeId = !lineage && shareRoots && tribeId ? tribeId : undefined;

    const input: RegisterInput = {
      displayName: displayName.trim(),
      email: normaliseEmail(email),
      password,
      acceptTerms,
      acceptPrivacy,
      confirmAge13Plus,
      ...(shareRoots ? { consentLineagePersonalisation: true } : {}),
      ...(chosenTribeId ? { tribeId: chosenTribeId } : {}),
      ...(lineage ? { customLineage: lineage } : {}),
      ...(communityRole ? { communityRole: communityRole as CommunityRole } : {}),
    };

    setPending(true);
    try {
      const auth = await register(input);
      await onSuccess?.(auth);
    } catch (error) {
      const parsed = interpretAuthError(error, 'signup');
      // Re-key roots errors onto the consent control rendered below the roots block.
      setErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setPending(false);
    }
  };

  const loginSearch = redirectTo ? { redirect: redirectTo } : undefined;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <FormError message={formError} />

      <div className={styles.fieldRow}>
        <Field id="signup-name" label="Your name" error={errors.displayName}>
          {({ describedBy, invalid }) => (
            <TextInput
              id="signup-name"
              name="displayName"
              autoComplete="name"
              placeholder="Thandiwe Nkosi"
              value={displayName}
              disabled={pending}
              aria-describedby={describedBy}
              invalid={invalid}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          )}
        </Field>

        <Field id="signup-email" label="Email" error={errors.email}>
          {({ describedBy, invalid }) => (
            <TextInput
              id="signup-email"
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
      </div>

      <Field
        id="signup-password"
        label="Password"
        error={errors.password}
        hint="At least 10 characters. A line from a favourite tale is easy to remember."
      >
        {({ describedBy, invalid }) => (
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            label="password"
            value={password}
            disabled={pending}
            aria-describedby={describedBy}
            invalid={invalid}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <CheckboxField
        id="signup-share-roots"
        checked={shareRoots}
        onChange={setShareRoots}
        disabled={pending}
        error={errors.lineageConsent}
        hint="Roots are sensitive personal information. We use them only to shape the stories you see, and you can change or remove them any time in Settings."
      >
        Share your roots to personalise stories — <em>optional</em>
      </CheckboxField>

      {shareRoots ? (
        <div className={styles.reveal}>
          <Field id="signup-tribe" label="Your publication" optional>
            {({ describedBy, invalid }) => (
              <SelectInput
                id="signup-tribe"
                name="tribeId"
                value={tribeId}
                disabled={pending}
                aria-describedby={describedBy}
                invalid={invalid}
                onChange={(event) => setTribeId(event.target.value)}
              >
                <option value="">
                  {tribesQuery.isPending ? 'Gathering publications…' : 'Prefer not to say'}
                </option>
                {(tribesQuery.data ?? []).map((tribe) => (
                  <option key={tribe.id} value={tribe.id}>
                    {tribe.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field
            id="signup-lineage"
            label="Or name your lineage"
            optional
            hint="A place, a people, a family line — written in your own words. This is used instead of the publication above."
          >
            {({ describedBy, invalid }) => (
              <TextInput
                id="signup-lineage"
                name="customLineage"
                autoComplete="off"
                placeholder="e.g. Maasai, Kajiado"
                value={customLineage}
                disabled={pending}
                aria-describedby={describedBy}
                invalid={invalid}
                onChange={(event) => setCustomLineage(event.target.value)}
              />
            )}
          </Field>
        </div>
      ) : null}

      <Field id="signup-role" label="How you join the circle" optional>
        {({ describedBy, invalid }) => (
          <SelectInput
            id="signup-role"
            name="communityRole"
            value={communityRole}
            disabled={pending}
            aria-describedby={describedBy}
            invalid={invalid}
            onChange={(event) => setCommunityRole(event.target.value)}
          >
            <option value="">Prefer not to say</option>
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <div className={styles.consentGroup}>
        <CheckboxField
          id="signup-age"
          checked={confirmAge13Plus}
          onChange={setConfirmAge13Plus}
          disabled={pending}
          error={errors.confirmAge13Plus}
        >
          I am 13 or older.
        </CheckboxField>

        <CheckboxField
          id="signup-terms"
          checked={acceptTerms}
          onChange={setAcceptTerms}
          disabled={pending}
          error={errors.acceptTerms}
        >
          I accept the{' '}
          <Link to="/legal/$slug" params={{ slug: 'terms' }} className={styles.inlineLink}>
            terms of reading
          </Link>
          .
        </CheckboxField>

        <CheckboxField
          id="signup-privacy"
          checked={acceptPrivacy}
          onChange={setAcceptPrivacy}
          disabled={pending}
          error={errors.acceptPrivacy}
        >
          I accept the{' '}
          <Link to="/legal/$slug" params={{ slug: 'privacy' }} className={styles.inlineLink}>
            privacy policy
          </Link>
          .
        </CheckboxField>

        <p className={styles.hint}>
          Reading stays free and open to everyone, account or not. Your roots are optional and can
          be removed at any time.
        </p>
      </div>

      <div className={styles.actions}>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? 'Opening your account…' : 'Open my account'}
        </Button>
      </div>

      <p className={styles.switchRow}>
        {onSwitchToLogin ? (
          <>
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} disabled={pending}>
              Sign in
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link to="/login" search={loginSearch} className={styles.inlineLink}>
              Sign in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
