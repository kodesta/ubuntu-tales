import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useCategories, useTribes } from '@/lib/queries';
import { useToastStore } from '@/stores/toast';
import { Button, Skeleton } from '@/ui';

import styles from './admin.module.css';

/** `/admin/stories/$id` — the story editor: metadata, paragraph text, publish transitions. */
export function AdminStoryEditor({ storyId }: { storyId: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showToast = useToastStore((state) => state.show);
  const story = useQuery({ queryKey: ['admin', 'story', storyId], queryFn: () => api.admin.stories.get(storyId) });
  const tribes = useTribes();
  const categories = useCategories();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [moral, setMoral] = useState('');
  const [paragraphs, setParagraphs] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data = story.data;
    if (!data) return;
    setTitle(data.title);
    setSummary(data.summary);
    setMoral(data.moral ?? '');
    setParagraphs(data.body.paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')).join('\n\n'));
  }, [story.data]);

  const categoryId = useMemo(() => story.data?.categoryId ?? '', [story.data?.categoryId]);
  const tribeId = useMemo(() => story.data?.tribeId ?? '', [story.data?.tribeId]);

  if (story.isPending) return <Skeleton lines={6} />;
  if (story.isError) return <p className={styles.error}>This story could not be loaded.</p>;

  const data = story.data;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.admin.stories.update(storyId, {
        title,
        summary,
        ...(moral ? { moral } : {}),
        paragraphs: paragraphs.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean),
      });
      showToast('Story saved.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'story', storyId] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'The story could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const transition = async (action: 'publish' | 'unpublish' | 'archive') => {
    setBusy(true);
    setError(null);
    try {
      await api.admin.stories[action](storyId);
      showToast(`Story ${action === 'publish' ? 'published' : action === 'unpublish' ? 'unpublished' : 'archived'}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      if (action === 'publish') void navigate({ to: '/stories/$slug', params: { slug: data.slug } });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'That transition failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className={styles.pageTitle}>{data.title}</h1>
      <p className={styles.pageIntro}>
        {data.status} · /{data.slug} · {data.wordCount} words
        {data.hasCover ? '' : ' · no cover yet'}
      </p>

      <div className={styles.form}>
        <label className={styles.field}>
          <span className={styles.label}>Title</span>
          <input className={styles.input} value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Summary (the dek)</span>
          <input className={styles.input} value={summary} onChange={(event) => setSummary(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>The wisdom</span>
          <input className={styles.input} value={moral} onChange={(event) => setMoral(event.target.value)} />
        </label>

        <div className={styles.toolbar}>
          <label>
            <span className={styles.label}>Publication</span>
            <select className={styles.select} value={tribeId} disabled>
              {(tribes.data ?? []).map((tribe) => (
                <option key={tribe.id} value={tribe.id}>{tribe.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={styles.label}>Category</span>
            <select className={styles.select} value={categoryId} disabled>
              {(categories.data ?? []).map((category) => (
                <option key={category.slug} value={category.id ?? ''}>{category.name}</option>
              ))}
            </select>
          </label>
          <span className={styles.label}>Paragraphs are split into sentences automatically; unchanged sentences keep their ids.</span>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Story text (blank line = new paragraph)</span>
          <textarea className={styles.textarea} value={paragraphs} onChange={(event) => setParagraphs(event.target.value)} />
        </label>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}

        <div className={styles.actions}>
          <Button onClick={() => void save()} disabled={busy}>Save changes</Button>
          {data.status !== 'PUBLISHED' ? (
            <Button variant="secondary" onClick={() => void transition('publish')} disabled={busy}>Publish</Button>
          ) : (
            <Button variant="secondary" onClick={() => void transition('unpublish')} disabled={busy}>Unpublish</Button>
          )}
          <Button variant="ghost" onClick={() => void transition('archive')} disabled={busy}>Archive</Button>
        </div>
      </div>
    </div>
  );
}
