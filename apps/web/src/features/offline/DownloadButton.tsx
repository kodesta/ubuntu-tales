import { Download, HardDriveDownload, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { requireAuth } from '@/features/auth';
import { Button } from '@/ui';
import { useIsAuthenticated } from '@/stores/session';
import { useToastStore } from '@/stores/toast';

import { isDownloaded, removeDownload, downloadStory, type DownloadProgress } from './downloadManager';
import styles from './DownloadButton.module.css';

export interface DownloadButtonProps {
  storySlug: string;
  storyTitle: string;
}

/** Saves a tale (text + narration) for offline use; sign-in is required because it is per-account. */
export function DownloadButton({ storySlug, storyTitle }: DownloadButtonProps) {
  const isAuthed = useIsAuthenticated();
  const showToast = useToastStore((state) => state.show);
  const [downloaded, setDownloaded] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);

  useEffect(() => {
    void isDownloaded(storySlug).then(setDownloaded);
  }, [storySlug]);

  const start = async () => {
    if (!isAuthed) {
      requireAuth(() => {
        showToast('Signed in — tap Download again to keep this tale offline.');
      }, { mode: 'login' });
      return;
    }
    try {
      await downloadStory(storySlug, { onProgress: setProgress });
      setDownloaded(true);
      showToast(`“${storyTitle}” is ready to read offline.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'The download failed. Try again.');
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    await removeDownload(storySlug);
    setDownloaded(false);
    showToast('Offline copy removed from this device.');
  };

  if (progress) {
    return (
      <span className={styles.progress} role="status">
        <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
        {progress.message} {progress.percent}%
      </span>
    );
  }

  return downloaded ? (
    <Button variant="ghost" size="sm" onClick={() => void remove()}>
      <Trash2 size={16} aria-hidden="true" /> Remove download
    </Button>
  ) : (
    <Button variant="ghost" size="sm" onClick={() => void start()}>
      {isAuthed ? (
        <Download size={16} aria-hidden="true" />
      ) : (
        <HardDriveDownload size={16} aria-hidden="true" />
      )}
      Download to read offline
    </Button>
  );
}
