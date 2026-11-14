import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SavedFilter, StoryCard } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReadingProgress } from '@/features/reader/readingProgress';
import { useSavedStore, type SavedEntry } from '@/stores/saved';
import { sampleStories } from '@/test/fixtures';

import { SavedFilters } from './SavedFilters';
import { countInProgress, filterSavedEntries } from './savedFilters';

const [firstStory, secondStory, thirdStory] = sampleStories as [
  StoryCard,
  StoryCard,
  StoryCard,
];

function entry(story: StoryCard, day = 1): SavedEntry {
  return {
    story,
    savedAt: `2026-11-${String(day).padStart(2, '0')}T06:00:00.000Z`,
  };
}

function progress(percent: number): ReadingProgress {
  return { percent, updatedAt: '2026-11-14T06:00:00.000Z' };
}

beforeEach(() => {
  window.localStorage.clear();
  useSavedStore.setState({ entries: [] });
});

describe('filterSavedEntries', () => {
  const entries = [entry(firstStory, 1), entry(secondStory, 2), entry(thirdStory, 3)];
  const progressBySlug: Record<string, ReadingProgress> = {
    [firstStory.slug]: progress(32),
    [secondStory.slug]: progress(100),
    // the third tale has not been opened yet
  };

  it('returns every saved tale for the All filter', () => {
    expect(filterSavedEntries(entries, 'all', progressBySlug)).toHaveLength(3);
  });

  it('returns only started-but-unfinished tales for In progress', () => {
    const filtered = filterSavedEntries(entries, 'in-progress', progressBySlug);
    expect(filtered.map((item) => item.story.slug)).toEqual([firstStory.slug]);
    expect(countInProgress(entries, progressBySlug)).toBe(1);
  });

  it('returns nothing for the disabled Offline filter', () => {
    expect(filterSavedEntries(entries, 'offline', progressBySlug)).toEqual([]);
  });
});

describe('saved store integration', () => {
  it('stores the StoryCard snapshot, orders newest first and removes instantly', () => {
    const { save, unsave } = useSavedStore.getState();

    save(firstStory);
    save(secondStory);

    expect(useSavedStore.getState().entries.map((item) => item.story.slug)).toEqual([
      secondStory.slug,
      firstStory.slug,
    ]);
    expect(useSavedStore.getState().isSaved(secondStory.slug)).toBe(true);
    expect(window.localStorage.getItem('ut.saved')).toContain(secondStory.slug);

    unsave(secondStory.slug);

    expect(useSavedStore.getState().entries.map((item) => item.story.slug)).toEqual([
      firstStory.slug,
    ]);
    expect(useSavedStore.getState().isSaved(secondStory.slug)).toBe(false);
  });
});

describe('SavedFilters', () => {
  it('marks the active filter and keeps Offline disabled with its hint', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: SavedFilter) => void>();
    render(<SavedFilters value="all" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');

    const offline = screen.getByRole('button', { name: /offline/i });
    expect(offline).toBeDisabled();
    expect(offline).toHaveAttribute('title', 'Offline reading is coming with downloads.');

    await user.click(offline);
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'In progress' }));
    expect(onChange).toHaveBeenCalledWith('in-progress');
  });
});
