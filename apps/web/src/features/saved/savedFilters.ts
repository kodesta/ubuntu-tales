import type { SavedFilter } from '@ubuntu-tales/shared';

import type { ReadingProgress } from '@/features/reader/readingProgress';
import { isInProgress } from '@/features/reader/readingProgress';
import type { SavedEntry } from '@/stores/saved';

export interface SavedFilterOption {
  value: SavedFilter;
  label: string;
  disabled?: boolean;
  /** Shown as a hint/`title` when the filter is not available yet. */
  note?: string;
}

export const SAVED_FILTER_OPTIONS: SavedFilterOption[] = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  {
    value: 'offline',
    label: 'Offline',
    disabled: true,
    note: 'Offline reading is coming with downloads.',
  },
];

/**
 * Applies the `/saved` filter to the on-device reading list. "Offline" is a Phase 3 feature, so it
 * resolves to an empty list rather than pretending to work.
 */
export function filterSavedEntries(
  entries: SavedEntry[],
  filter: SavedFilter,
  progressBySlug: Record<string, ReadingProgress>,
): SavedEntry[] {
  if (filter === 'offline') return [];
  if (filter === 'in-progress') {
    return entries.filter((entry) => isInProgress(progressBySlug[entry.story.slug]));
  }
  return entries;
}

/** Count of saved tales that have been started but not finished. */
export function countInProgress(
  entries: SavedEntry[],
  progressBySlug: Record<string, ReadingProgress>,
): number {
  return entries.filter((entry) => isInProgress(progressBySlug[entry.story.slug])).length;
}
