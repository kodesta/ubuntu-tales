import { Link, useNavigate } from '@tanstack/react-router';
import type { SubmissionDetail } from '@ubuntu-tales/shared';
import { useEffect, useState } from 'react';

import { requireAuth } from '@/features/auth';
import { api, ApiError } from '@/lib/api';
import { useTribes } from '@/lib/queries';
import { useCategories } from '@/lib/queries';
import { useIsAuthenticated, useSessionStore } from '@/stores/session';
import { useToastStore } from '@/stores/toast';
import { Button, EmptyState, Masthead, PageShell } from '@/ui';

import styles from './submissions.module.css';

const DRAFT_KEY = 'ut.submissionDraft';

interface DraftState {
  title: string;
  bodyText: string;
  moral: string;
  tribeId: string;
  customTribe: string;
  categoryId: string;
  attribution: string;
  rightsConfirmed: boolean;
}

const EMPTY: DraftState = {
  title: '',
  bodyText: '',
  moral: '',
  tribeId: '',
  customTribe: '',
  categoryId: '',
  attribution: '',
  rightsConfirmed: false,
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** `/submit` — the community tale submission form (production plan 03 §2.8, task 4.7). */
export function SubmitPage() {
  const isAuthed = useIsAuthenticated();
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.show);
  const tribes = useTribes();
  const categories = useCategories();

  const [draft, setDraft] = useState<DraftState>(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      return stored ? { ...EMPTY, ...(JSON.parse(stored) as Partial<DraftState>) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (status === 'guest') requireAuth(undefined, { redirectTo: '/submit' });
  }, [status]);

  const words = wordCount(draft.bodyText);
  const canSubmit = words >= 150 && words <= 5000 && draft.title.trim().length >= 3 && draft.rightsConfirmed && Boolean(draft.tribeId || draft.customTribe);

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async (thenSubmit: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: draft.title.trim(),
        bodyText: draft.bodyText.trim(),
        ...(draft.moral.trim() ? { moral: draft.moral.trim() } : {}),
        ...(draft.tribeId ? { tribeId: draft.tribeId } : {}),
        ...(draft.customTribe.trim() ? { customTribe: draft.customTribe.trim() } : {}),
        ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
        ...(draft.attribution.trim() ? { attribution: draft.attribution.trim() } : {}),
        rightsConfirmed: draft.rightsConfirmed,
      };
      const saved = submission
        ? await api.submissions.update(submission.id, payload)
        : await api.submissions.create(payload);
      setSubmission(saved);
      if (thenSubmit) {
        await api.submissions.submit(saved.id);
        localStorage.removeItem(DRAFT_KEY);
        showToast('Your tale is with the editors. Thank you for trusting us with it.');
        void navigate({ to: '/me/submissions' });
      } else {
        showToast('Draft saved. You can come back to it any time.');
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'We could not save your submission.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'unknown') return null;

  if (!isAuthed) {
    return (
      <PageShell>
        <EmptyState
          eyebrow="Submissions"
          title="Share a tale with the archive."
          headingLevel={1}
          body="Sign in to write and submit a tale. We ask for a verified email so the editors can reach you."
          action={<Button onClick={() => requireAuth(undefined, { redirectTo: '/submit' })}>Sign in to continue</Button>}
        />
      </PageShell>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <PageShell>
        <EmptyState
          eyebrow="Submissions"
          title="Verify your email first."
          headingLevel={1}
          body="We only accept tales from verified accounts, so the editors know who to thank."
          action={<Link to="/verify-email">Verify your email</Link>}
        />
      </PageShell>
    );
  }

  const tribesList = tribes.data ?? [];
  const categoriesList = categories.data ?? [];

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <Masthead
          eyebrow="Community tales"
          title="Add your voice to the fire."
          intro="Tell it as you heard it. The editors read every submission with care, and we will email you when yours is reviewed."
        />

        {submission ? (
          <p className={styles.savedNote} role="status">
            Draft saved. <Link to="/me/submissions">See your submissions</Link>.
          </p>
        ) : null}

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void save(true);
          }}
        >
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              className={styles.input}
              value={draft.title}
              maxLength={160}
              onChange={(event) => update('title', event.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>The tale ({words} words)</span>
            <span className={styles.hint}>150–5,000 words. Separate paragraphs with a blank line.</span>
            <textarea
              className={styles.textarea}
              value={draft.bodyText}
              rows={14}
              onChange={(event) => update('bodyText', event.target.value)}
              required
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>The wisdom (optional)</span>
            <input
              className={styles.input}
              value={draft.moral}
              maxLength={300}
              onChange={(event) => update('moral', event.target.value)}
            />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Publication</span>
              <select
                className={styles.input}
                value={draft.tribeId}
                onChange={(event) => update('tribeId', event.target.value)}
              >
                <option value="">Choose a publication…</option>
                {tribesList.map((tribe) => (
                  <option key={tribe.id} value={tribe.id}>{tribe.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>…or a custom lineage</span>
              <input
                className={styles.input}
                value={draft.customTribe}
                onChange={(event) => update('customTribe', event.target.value)}
                placeholder="e.g. Ndau, Mozambique"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <select
              className={styles.input}
              value={draft.categoryId}
              onChange={(event) => update('categoryId', event.target.value)}
            >
              <option value="">Choose a category…</option>
              {categoriesList.map((category) => (
                <option key={category.slug} value={category.id ?? ''}>{category.name}</option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Attribution (optional)</span>
            <input
              className={styles.input}
              value={draft.attribution}
              onChange={(event) => update('attribution', event.target.value)}
              placeholder="How should we credit this telling?"
            />
          </label>

          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={draft.rightsConfirmed}
              onChange={(event) => update('rightsConfirmed', event.target.checked)}
            />
            <span>
              I have the right to share this tale, and I agree that it may be published under
              CC BY 4.0 with attribution to the tradition it comes from.
            </span>
          </label>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}

          <div className={styles.actions}>
            <Button type="submit" disabled={!canSubmit || busy}>
              {busy ? 'Sending…' : 'Submit for review'}
            </Button>
            <Button type="button" variant="secondary" disabled={busy} onClick={() => void save(false)}>
              Save draft
            </Button>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
