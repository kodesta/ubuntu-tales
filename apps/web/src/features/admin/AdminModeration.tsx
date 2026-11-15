import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useToastStore } from '@/stores/toast';
import { Button, Skeleton } from '@/ui';

import styles from './admin.module.css';

/** `/admin/moderation` — the submissions queue and its actions (production plan 06 §9). */
export function AdminModeration() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const [status, setStatus] = useState('SUBMITTED');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const queue = useQuery({
    queryKey: ['admin', 'moderation', status],
    queryFn: () => api.admin.submissions.queue({ status: status as 'SUBMITTED' | 'IN_REVIEW', limit: 50 }),
  });

  const act = async (action: 'claim' | 'approve' | 'requestChanges' | 'reject', id: string) => {
    setError(null);
    try {
      const input = { note: note || undefined };
      await (action === 'claim'
        ? api.admin.submissions.claim(id)
        : api.admin.submissions[action](id, input));
      showToast('Submission updated.');
      setNote('');
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That action failed.');
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>Moderation</h1>
      <p className={styles.pageIntro}>Community tales waiting for an editorial eye.</p>

      <div className={styles.toolbar}>
        <label>
          <span className={styles.label}>Queue</span>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_REVIEW">In review</option>
            <option value="CHANGES_REQUESTED">Changes requested</option>
            <option value="APPROVED">Approved</option>
          </select>
        </label>
        <label>
          <span className={styles.label}>Reviewer note</span>
          <input className={styles.input} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note for the author" />
        </label>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {queue.isPending ? <Skeleton lines={4} /> : null}

      {queue.isSuccess ? (
        queue.data.items.length === 0 ? (
          <p className={styles.empty}>The queue is clear.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Author</th>
                <th>Words</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {queue.data.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.title}
                    {item.reviewerNote ? <p className={styles.status}>“{item.reviewerNote}”</p> : null}
                  </td>
                  <td>{item.author.displayName}</td>
                  <td>{item.wordCount}</td>
                  <td><span className={styles.status}>{item.status}</span></td>
                  <td>
                    <div className={styles.actions}>
                      {item.status === 'SUBMITTED' ? (
                        <Button size="sm" variant="secondary" onClick={() => void act('claim', item.id)}>Claim</Button>
                      ) : null}
                      <Button size="sm" onClick={() => void act('approve', item.id)}>Approve</Button>
                      <Button size="sm" variant="secondary" onClick={() => void act('requestChanges', item.id)}>Request changes</Button>
                      <Button size="sm" variant="ghost" onClick={() => void act('reject', item.id)}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}
    </div>
  );
}
