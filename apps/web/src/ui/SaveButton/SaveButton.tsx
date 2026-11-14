import type { StoryCard } from '@ubuntu-tales/shared';
import { Bookmark, BookmarkCheck } from 'lucide-react';

import { useSavedStore } from '@/stores/saved';
import { ON_DEVICE_NOTE, useToastStore } from '@/stores/toast';

import { IconButton } from '../IconButton/IconButton';

export interface SaveButtonProps {
  story: StoryCard;
  size?: 'sm' | 'md';
  variant?: 'ghost' | 'paper' | 'solid';
  className?: string;
}

/** Save/unsave a tale on this device (local-first; Phase 2 swaps in an API mutation). */
export function SaveButton({ story, size = 'md', variant = 'ghost', className }: SaveButtonProps) {
  const saved = useSavedStore((state) =>
    state.entries.some((entry) => entry.story.slug === story.slug),
  );
  const toggle = useSavedStore((state) => state.toggle);
  const showToast = useToastStore((state) => state.show);

  return (
    <IconButton
      label={saved ? 'Remove from your reading list' : 'Save to your reading list'}
      aria-pressed={saved}
      size={size}
      variant={variant}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const nowSaved = toggle(story);
        showToast(nowSaved ? ON_DEVICE_NOTE : 'Removed from your reading list.');
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

/** Selector hook for route components that need the saved state without rendering a button. */
export function useIsSaved(slug: string): boolean {
  return useSavedStore((state) => state.entries.some((entry) => entry.story.slug === slug));
}
