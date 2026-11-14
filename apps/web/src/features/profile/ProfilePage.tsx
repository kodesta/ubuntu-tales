import { Link } from '@tanstack/react-router';
import type { CommunityRole, MePatchInput, UserMe } from '@ubuntu-tales/shared';
import { useState, type FormEvent, type ReactNode } from 'react';

import { interpretAuthError } from '@/features/auth/authErrors';
import { communityRoleLabel, FALLBACK_COMMUNITY_ROLES } from '@/features/auth/communityRoles';
import { Field, FormError, SelectInput, TextInput } from '@/features/auth/fields';
import formStyles from '@/features/auth/form.module.css';
import { firstNameOf, validateDisplayName } from '@/features/auth/validation';
import { api } from '@/lib/api';
import { formatShortDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { usePublicConfig, useTribes } from '@/lib/queries';
import { useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import {
  Avatar,
  Badge,
  Button,
  buttonClassName,
  EmptyState,
  Masthead,
  PageShell,
} from '@/ui';

import styles from './account.module.css';

interface FieldErrors {
  [field: string]: string | undefined;
}

/**
 * `/profile` — the reader's editorial account page (brief item 4): initials avatar, account
 * details, roots/publication, community role, honest stats from `UserMe.stats`, and an inline
 * form to edit name/roots/role through `PATCH /me`.
 */
export function ProfilePage() {
  useDocumentTitle('Your account — Ubuntu Tales');
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);

  if (!user) {
    return (
      <PageShell variant="narrow">
        <EmptyState
          eyebrow="Your account"
          title={status === 'unknown' ? 'Finding your place…' : 'This page is for account holders.'}
          body={
            status === 'unknown'
              ? 'One quiet moment while we restore your session.'
              : 'Reading stays free without an account. Sign in to keep your list, roots and place.'
          }
          action={
            status === 'guest' ? (
              <Link to="/login" search={{ redirect: '/profile' }} className={buttonClassName('primary')}>
                Sign in
              </Link>
            ) : null
          }
        />
      </PageShell>
    );
  }

  return <ProfileContent key={user.id} user={user} />;
}

function rootsValue(user: UserMe): ReactNode {
  if (user.tribe) {
    return (
      <Link to="/tribes/$slug" params={{ slug: user.tribe.slug }} className={styles.inlineLink}>
        {user.tribe.name}
      </Link>
    );
  }
  const lineage = user.lineageLabel || user.customLineage;
  if (lineage) return lineage;
  return (
    <Link to="/tribes" search={{ onboarding: 1 }} className={styles.inlineLink}>
      Choose your roots
    </Link>
  );
}

function ProfileContent({ user }: { user: UserMe }) {
  const updateUser = useSessionStore((state) => state.updateUser);
  const showToast = useToastStore((state) => state.show);
  const tribesQuery = useTribes();
  const configQuery = usePublicConfig();
  const roles = configQuery.data?.communityRoles?.length
    ? configQuery.data.communityRoles.map((role) => ({ value: role.value, label: role.label }))
    : FALLBACK_COMMUNITY_ROLES;

  const [displayName, setDisplayName] = useState(user.displayName);
  const [tribeId, setTribeId] = useState(user.tribe?.id ?? '');
  const [customLineage, setCustomLineage] = useState(user.customLineage ?? '');
  const [communityRole, setCommunityRole] = useState(user.communityRole ?? '');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  const roleLabel = communityRoleLabel(user.communityRole, roles);
  const firstName = firstNameOf(user.displayName);

  const stats = [
    { label: 'Tales read', value: user.stats.talesRead },
    { label: 'Tribes explored', value: user.stats.tribesExplored },
    { label: 'Listening minutes', value: user.stats.listeningMinutes },
    { label: 'Day streak', value: user.stats.currentStreakDays },
  ];

  const resetForm = () => {
    setDisplayName(user.displayName);
    setTribeId(user.tribe?.id ?? '');
    setCustomLineage(user.customLineage ?? '');
    setCommunityRole(user.communityRole ?? '');
    setErrors({});
    setFormError('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nameError = validateDisplayName(displayName);
    setErrors(nameError ? { displayName: nameError } : {});
    setFormError('');
    if (nameError) return;

    const lineage = customLineage.trim();
    const patch: MePatchInput = {
      displayName: displayName.trim(),
      // At most one of tribe/lineage; a written lineage wins.
      tribeId: lineage ? null : tribeId || null,
      customLineage: lineage || null,
      communityRole: (communityRole as CommunityRole) || null,
    };

    setPending(true);
    try {
      const updated = await api.me.update(patch);
      updateUser(updated);
      showToast('Your details are saved.', { variant: 'success' });
    } catch (failure) {
      const parsed = interpretAuthError(failure, 'profile');
      setErrors(parsed.fields);
      setFormError(parsed.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <PageShell>
      <Masthead
        eyebrow="Your account"
        title="Your reading life."
        intro={`The tales you have read, the roots you chose, and the place where the fire is kept. Welcome, ${firstName}.`}
      />

      <div className={styles.grid}>
        <div className={styles.main}>
          <section className={styles.card} aria-labelledby="profile-identity">
            <div className={styles.identity}>
              <Avatar name={user.displayName} image={user.avatar} size="lg" />
              <div className={styles.identityText}>
                <h2 id="profile-identity" className={styles.name}>
                  {user.displayName}
                </h2>
                <p className={styles.email}>{user.email}</p>
                <div className={styles.badgeRow}>
                  {user.emailVerified ? (
                    <Badge variant="outline">Email verified</Badge>
                  ) : (
                    <Link to="/verify-email" className={styles.inlineLink}>
                      Verify your email
                    </Link>
                  )}
                  {roleLabel ? <Badge variant="neutral">{roleLabel}</Badge> : null}
                </div>
              </div>
            </div>

            <div className={styles.metaList}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Roots</span>
                <span className={styles.metaValue}>{rootsValue(user)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Reader since</span>
                <span className={styles.metaValue}>{formatShortDate(user.createdAt)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Account</span>
                <span className={styles.metaValue}>
                  {user.emailVerified ? 'Verified' : 'Awaiting verification'}
                </span>
              </div>
            </div>
          </section>

          <section className={styles.card} aria-labelledby="profile-stats">
            <div className={styles.cardHead}>
              <div>
                <p className={styles.eyebrow}>The tally</p>
                <h2 id="profile-stats" className={styles.cardTitle}>
                  Your reading so far.
                </h2>
              </div>
            </div>
            <div className={styles.stats}>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.stat}>
                  <span className={styles.statValue}>{stat.value}</span>
                  <span className={styles.statLabel}>{stat.label}</span>
                </div>
              ))}
            </div>
            <p className={styles.note}>
              Counts come from the tales you finish and the publications you open. Listening minutes
              stay at zero until narrations are recorded.
            </p>
          </section>

          <section className={styles.card} aria-labelledby="profile-details">
            <div className={styles.cardHead}>
              <div>
                <p className={styles.eyebrow}>Editable any time</p>
                <h2 id="profile-details" className={styles.cardTitle}>
                  Your details.
                </h2>
              </div>
            </div>
            <p className={styles.cardIntro}>
              Choose roots to shape your feed, or name your lineage in your own words. You can remove
              both at any time — they are never shown publicly in the reading list.
            </p>

            <form className={formStyles.form} onSubmit={handleSubmit} noValidate aria-busy={pending}>
              <FormError message={formError} />

              <Field id="profile-name" label="Display name" error={errors.displayName}>
                {({ describedBy, invalid }) => (
                  <TextInput
                    id="profile-name"
                    name="displayName"
                    autoComplete="name"
                    value={displayName}
                    disabled={pending}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                )}
              </Field>

              <Field id="profile-tribe" label="Your publication" optional>
                {({ describedBy, invalid }) => (
                  <SelectInput
                    id="profile-tribe"
                    name="tribeId"
                    value={tribeId}
                    disabled={pending || tribesQuery.isPending}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    onChange={(event) => setTribeId(event.target.value)}
                  >
                    <option value="">Prefer not to say</option>
                    {(tribesQuery.data ?? []).map((tribe) => (
                      <option key={tribe.id} value={tribe.id}>
                        {tribe.name}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>

              <Field
                id="profile-lineage"
                label="Or name your lineage"
                optional
                hint="A place, a people, a family line — in your own words."
              >
                {({ describedBy, invalid }) => (
                  <TextInput
                    id="profile-lineage"
                    name="customLineage"
                    value={customLineage}
                    disabled={pending}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    onChange={(event) => setCustomLineage(event.target.value)}
                  />
                )}
              </Field>

              <Field id="profile-role" label="How you join the circle" optional>
                {({ describedBy, invalid }) => (
                  <SelectInput
                    id="profile-role"
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

              <div className={styles.actionsRow}>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving…' : 'Save details'}
                </Button>
                <Button type="button" variant="ghost" disabled={pending} onClick={resetForm}>
                  Undo changes
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className={styles.aside} aria-label="Account links">
          <section className={styles.card}>
            <p className={styles.eyebrow}>Where to next</p>
            <div className={styles.sideLinks}>
              <Link to="/saved" className={styles.sideLink}>
                Your reading list
                <span className={styles.sideLinkHint}>Saved tales</span>
              </Link>
              <Link to="/settings" className={styles.sideLink}>
                Settings
                <span className={styles.sideLinkHint}>Password, data</span>
              </Link>
              <Link to="/library" className={styles.sideLink}>
                The archive
                <span className={styles.sideLinkHint}>All tales</span>
              </Link>
              <Link to="/tribes" className={styles.sideLink}>
                Publications
                <span className={styles.sideLinkHint}>All tribes</span>
              </Link>
            </div>
          </section>

          {user.tribe ? (
            <section className={styles.card}>
              <p className={styles.eyebrow}>Your publication</p>
              <h2 className={styles.cardTitle}>{user.tribe.name}</h2>
              {user.tribe.tagline ? <p className={styles.cardIntro}>{user.tribe.tagline}</p> : null}
              <Link
                to="/tribes/$slug"
                params={{ slug: user.tribe.slug }}
                className={buttonClassName('secondary', 'sm')}
              >
                Visit {user.tribe.name}
              </Link>
            </section>
          ) : null}

          <section className={styles.card}>
            <p className={styles.eyebrow}>A quiet promise</p>
            <p className={styles.note}>
              Your roots are sensitive personal information. They are optional, visible only to you,
              and removable here in two clicks.
            </p>
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
