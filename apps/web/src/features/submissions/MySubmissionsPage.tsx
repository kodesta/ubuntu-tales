import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';

import { requireAuth } from '@/features/auth';
import { useIsAuthenticated } from '@/stores/session';
import { api } from '@/lib/api';
import { Button, EmptyState, Masthead, PageShell, Skeleton } from '@/ui';

import styles from './submissions.module.css';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'With the editors',
  IN_REVIEW: 'Being read',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  REJECTED: 'Not accepted',
  WITHDRAWN: 'Withdrawn',
};

/** `/me/submissions` — the author's own tales and their review status. */
export function MySubmissionsPage() {
  const isAuthed = useIsAuthenticated();
  const submissions = useQuery({
    queryKey: ['submissions', 'mine'],
    queryFn: ({ signal }) => api.submissions.mine({ limit: 50, signal }),
    enabled: isAuthed,
  });

  if (!isAuthed) {
    return (
      <PageShell>
        <EmptyState
          eyebrow="Your submissions"
          title="Sign in to see your tales."
          headingLevel={1}
          body="Your submitted stories and their review status live with your account."
          action={<Button onClick={() => requireAuth(undefined, { redirectTo: '/me/submissions' })}>Sign in</Button>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell variant="publication">
      <div className={styles.page}>
        <Masthead
          eyebrow="Your submissions"
          title="Tales you have shared."
          intro="Every tale you send to the editors lives here, with its status and any notes they leave."
        />

        {submissions.isPending ? <Skeleton lines={4} /> : null}

        {submissions.isSuccess && submissions.data.items.length === 0 ? (
          <EmptyState
            eyebrow="Nothing yet"
            title="Your first tale is waiting."
            body="When you are ready, write it down the way you heard it."
            action={<Link to="/submit">Submit a tale</Link>}
          />
        ) : null}

        {submissions.isSuccess && submissions.data.items.length > 0 ? (
          <ul className={styles.rows}>
            {submissions.data.items.map((item) => (
              <li key={item.id} className={styles.rowItem}>
                <div>
                  <p className={styles.rowTitle}>{item.title}</p>
                  <p className={styles.note}>
                    {item.wordCount} words
                    {item.tribeName ? ` · ${item.tribeName}` : item.customTribe ? ` · ${item.customTribe}` : ''}
                    {item.reviewerNote ? ` · “${item.reviewerNote}”` : ''}
                  </p>
                </div>
                <span className={styles.status}>{STATUS_LABELS[item.status] ?? item.status}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </PageShell>
  );
}
