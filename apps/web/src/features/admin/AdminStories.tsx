import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { api } from '@/lib/api';
import { Skeleton } from '@/ui';

import styles from './admin.module.css';

export function AdminStories() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const stories = useQuery({
    queryKey: ['admin', 'stories', status, q],
    queryFn: () => api.admin.stories.list({ ...(status ? { status: status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' } : {}), ...(q ? { q } : {}), limit: 50 }),
  });

  return (
    <div>
      <h1 className={styles.pageTitle}>Stories</h1>
      <p className={styles.pageIntro}>Every tale in the archive, in any state.</p>

      <div className={styles.toolbar}>
        <label>
          <span className={styles.label}>Status</span>
          <select className={styles.select} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label>
          <span className={styles.label}>Search</span>
          <input className={styles.input} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Title or summary" />
        </label>
      </div>

      {stories.isPending ? <Skeleton lines={5} /> : null}
      {stories.isError ? <p className={styles.error}>Stories could not be loaded.</p> : null}

      {stories.isSuccess ? (
        stories.data.items.length === 0 ? (
          <p className={styles.empty}>No tales match that filter.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Publication</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {stories.data.items.map((story) => (
                <tr key={story.id}>
                  <td>
                    <Link to="/admin/stories/$id" params={{ id: story.id }}>{story.title}</Link>
                    {story.hasAudio ? <span className={styles.status}> · audio</span> : null}
                  </td>
                  <td>{story.tribe.name}</td>
                  <td><span className={styles.status}>{story.status}</span></td>
                  <td>{new Date(story.updatedAt).toLocaleDateString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}
    </div>
  );
}
