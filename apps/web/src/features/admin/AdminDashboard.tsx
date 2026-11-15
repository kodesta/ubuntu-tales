import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

import { api } from '@/lib/api';
import { Skeleton } from '@/ui';

import styles from './admin.module.css';

export function AdminDashboard() {
  const metrics = useQuery({ queryKey: ['admin', 'metrics'], queryFn: () => api.admin.metrics.overview() });

  return (
    <div>
      <h1 className={styles.pageTitle}>The console</h1>
      <p className={styles.pageIntro}>A quiet view of the archive: what is published, and who is reading.</p>

      {metrics.isPending ? <Skeleton lines={4} /> : null}
      {metrics.isError ? <p className={styles.error}>The metrics could not be loaded.</p> : null}

      {metrics.isSuccess ? (
        <>
          <div className={styles.cards}>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.stories.published}</p>
              <p className={styles.cardLabel}>Published tales</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.stories.draft}</p>
              <p className={styles.cardLabel}>Drafts</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.narrations}</p>
              <p className={styles.cardLabel}>Narrations</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.submissions.pending}</p>
              <p className={styles.cardLabel}>Awaiting moderation</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.users.total}</p>
              <p className={styles.cardLabel}>Readers</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.completionsLast7Days}</p>
              <p className={styles.cardLabel}>Finished this week</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.listeningHoursLast7Days}h</p>
              <p className={styles.cardLabel}>Listening this week</p>
            </div>
            <div className={styles.card}>
              <p className={styles.cardValue}>{metrics.data.tribes}</p>
              <p className={styles.cardLabel}>Publications</p>
            </div>
          </div>

          <div className={styles.actions}>
            <Link to="/admin/stories">Manage stories</Link>
            <Link to="/admin/moderation">Moderation queue ({metrics.data.submissions.pending})</Link>
            <Link to="/submit">Write a submission</Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
