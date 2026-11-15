import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useToastStore } from '@/stores/toast';
import { Button, Skeleton } from '@/ui';

import styles from './admin.module.css';

function isoDay(offset = 0): string {
  const date = new Date(Date.now() + offset * 86_400_000);
  return date.toISOString().slice(0, 10);
}

/** `/admin/story-of-the-day` — calendar scheduling for the home hero (task 4.4). */
export function AdminStoryOfDay() {
  const queryClient = useQueryClient();
  const showToast = useToastStore((state) => state.show);
  const [date, setDate] = useState(isoDay(1));
  const [storyId, setStoryId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const schedule = useQuery({
    queryKey: ['admin', 'story-of-the-day'],
    queryFn: () => api.admin.storyOfTheDay.list(isoDay(0), isoDay(45)),
  });
  const stories = useQuery({
    queryKey: ['admin', 'stories', 'PUBLISHED', ''],
    queryFn: () => api.admin.stories.list({ status: 'PUBLISHED', limit: 50 }),
  });

  const assign = async () => {
    setError(null);
    if (!storyId) {
      setError('Choose a tale first.');
      return;
    }
    try {
      await api.admin.storyOfTheDay.set(date, storyId);
      showToast(`Scheduled for ${date}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'story-of-the-day'] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That date could not be scheduled.');
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>Story of the day</h1>
      <p className={styles.pageIntro}>Choose the tale that greets readers on the home page.</p>

      <div className={styles.toolbar}>
        <label>
          <span className={styles.label}>Date</span>
          <input className={styles.input} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          <span className={styles.label}>Tale</span>
          <select className={styles.select} value={storyId} onChange={(event) => setStoryId(event.target.value)}>
            <option value="">Choose a published tale…</option>
            {(stories.data?.items ?? []).map((story) => (
              <option key={story.id} value={story.id}>{story.title}</option>
            ))}
          </select>
        </label>
        <Button onClick={() => void assign()}>Schedule</Button>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {schedule.isPending ? <Skeleton lines={3} /> : null}

      {schedule.isSuccess ? (
        schedule.data.length === 0 ? (
          <p className={styles.empty}>Nothing scheduled in the next six weeks.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr><th>Date</th><th>Tale</th><th /></tr>
            </thead>
            <tbody>
              {schedule.data.map((entry) => (
                <tr key={entry.date}>
                  <td>{entry.date}</td>
                  <td>{entry.title}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await api.admin.storyOfTheDay.remove(entry.date);
                        showToast(`${entry.date} cleared.`);
                        await queryClient.invalidateQueries({ queryKey: ['admin', 'story-of-the-day'] });
                      }}
                    >
                      Remove
                    </Button>
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
