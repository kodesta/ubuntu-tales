import type { StoryCard } from '@ubuntu-tales/shared';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useState } from 'react';

import { announceSavedToggle, toggleSavedWithSync } from '@/features/saved/savedSync';
import { useIsAuthenticated } from '@/stores/session';
import { useSavedStore } from '@/stores/saved';

import { IconButton } from '../IconButton/IconButton';
import styles from './SaveButton.module.css';

export interface SaveButtonProps {
  story: StoryCard;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'paper' | 'solid';
  className?: string;
}

/**
 * Save/unsave a tale. Guests keep the original local-only reading list ("accounts are coming
 * soon"); signed-in readers write through `PUT/DELETE /me/saved` optimistically with rollback.
 */
export function SaveButton({ story, size = 'md', variant = 'ghost', className }: SaveButtonProps) {
  const isAuthed = useIsAuthenticated();
  const hydrated = useSavedStore((state) => state.hydrated);
  const inStore = useSavedStore((state) =>
    state.entries.some((entry) => entry.story.slug === story.slug),
  );
  const [pending, setPending] = useState(false);
  // Local optimistic truth: the viewer overlay can be stale until the store hydrates, so keep the
  // user-visible state here once they act (and reset it to the API's verdict when the write lands).
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);

  // Until the account list has hydrated, the per-response `viewer` overlay is the freshest truth.
  const effectiveSaved = isAuthed && !hydrated ? (story.viewer?.saved ?? inStore) : inStore;
  const saved = savedOverride ?? effectiveSaved;

  return (
    <IconButton
      label={saved ? 'Remove from your reading list' : 'Save to your reading list'}
      aria-pressed={saved}
      size={size}
      variant={variant}
      // QA: keep the touch target at 44x44 even in the compact ("sm") archive rows.
      className={[styles.saveButton, className].filter(Boolean).join(' ')}
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (pending) return;
        const previouslySaved = saved;
        setPending(true);
        setSavedOverride(!previouslySaved);
        void toggleSavedWithSync(story, previouslySaved)
          .then((outcome) => {
            setSavedOverride(outcome.saved);
            setPending(false);
            announceSavedToggle(outcome);
          })
          .catch(() => {
            setSavedOverride(previouslySaved);
            setPending(false);
          });
      }}
    >
      {saved ? (
        <BookmarkCheck size={size === 'sm' ? 18 : 20} aria-hidden="true" />
      ) : (
        <Bookmark size={size === 'sm' ? 18 : 20} aria-hidden="true" />
      )}
    </IconButton>
  );
}

/** Selector hook for route components that need the local saved state without a button. */
export function useIsSaved(slug: string): boolean {
  return useSavedStore((state) => state.entries.some((entry) => entry.story.slug === slug));
}
