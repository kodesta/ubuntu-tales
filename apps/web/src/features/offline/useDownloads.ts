import { useCallback, useEffect, useState } from 'react';

import { listDownloads, removeDownload, downloadStory, storageUsage, type DownloadProgress } from './downloadManager';

export interface DownloadEntry {
  slug: string;
  title: string;
  coverUrl?: string;
  bytes: number;
  savedAt: string;
}

/** Lists this device's downloads and exposes download/remove actions for the UI. */
export function useDownloads() {
  const [entries, setEntries] = useState<DownloadEntry[]>([]);
  const [usage, setUsage] = useState({ bytes: 0, count: 0 });
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [items, storage] = await Promise.all([listDownloads(), storageUsage()]);
    setEntries(
      items.map(({ slug, record }) => ({
        slug,
        title: record.bundle.story.title,
        coverUrl: record.bundle.story.cover.url,
        bytes: record.bytes,
        savedAt: record.savedAt,
      })),
    );
    setUsage(storage);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const download = useCallback(
    async (slug: string) => {
      setError(null);
      try {
        await downloadStory(slug, { onProgress: setProgress });
        await refresh();
        return true;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'The download failed.');
        return false;
      } finally {
        window.setTimeout(() => setProgress(null), 1500);
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (slug: string) => {
      await removeDownload(slug);
      await refresh();
    },
    [refresh],
  );

  return { entries, usage, progress, error, download, remove, refresh };
}
