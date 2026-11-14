import type { Paginated, StoryCard } from '@ubuntu-tales/shared';
import { describe, expect, it } from 'vitest';

import { sampleStories } from '@/test/fixtures';

import {
  flattenPages,
  libraryFeedQueryOptions,
  voicesFeedQueryOptions,
  type ArchiveTab,
} from './libraryFeed';

const [firstStory, secondStory, thirdStory] = sampleStories as [
  StoryCard,
  StoryCard,
  StoryCard,
];

function page(items: StoryCard[], nextCursor: string | null = null): Paginated<StoryCard> {
  return { items, nextCursor };
}

describe('flattenPages', () => {
  it('merges pages in order', () => {
    const pages = [page([firstStory, secondStory], 'cursor-2'), page([thirdStory], null)];

    expect(flattenPages(pages).map((story) => story.slug)).toEqual([
      firstStory.slug,
      secondStory.slug,
      thirdStory.slug,
    ]);
  });

  it('drops duplicate rows that appear across overlapping pages', () => {
    const pages = [page([firstStory, secondStory], 'cursor-2'), page([secondStory, thirdStory], null)];

    const merged = flattenPages(pages);
    expect(merged).toHaveLength(3);
    expect(merged.map((story) => story.slug)).toEqual([
      firstStory.slug,
      secondStory.slug,
      thirdStory.slug,
    ]);
  });

  it('handles missing and empty pages', () => {
    expect(flattenPages(undefined)).toEqual([]);
    expect(flattenPages([page([]), page([])])).toEqual([]);
  });
});

describe('library feed query options', () => {
  it('keeps a separate cache slot per tab and category so pages survive tab switches', () => {
    const allTales = libraryFeedQueryOptions('stories', '');
    const wisdomTales = libraryFeedQueryOptions('stories', 'wisdom');
    const audio = libraryFeedQueryOptions('audio', '');

    expect(allTales.queryKey).toEqual(['library-feed', 'stories', '']);
    expect(wisdomTales.queryKey).toEqual(['library-feed', 'stories', 'wisdom']);
    expect(audio.queryKey).toEqual(['library-feed', 'audio', '']);

    const keys = new Set(
      [allTales, wisdomTales, audio].map((options) => JSON.stringify(options.queryKey)),
    );
    expect(keys.size).toBe(3);
  });

  it('reads the next cursor from the last page and stops on null', () => {
    const options = libraryFeedQueryOptions('stories');

    expect(options.getNextPageParam?.(page([firstStory], 'cursor-2'), [], null, [])).toBe(
      'cursor-2',
    );
    expect(options.getNextPageParam?.(page([firstStory], null), [], null, [])).toBeNull();
  });

  it('gives the voices feed its own stable cache slot', () => {
    expect(voicesFeedQueryOptions().queryKey).toEqual(['library-voices']);
  });
});

describe('ArchiveTab type', () => {
  it('accepts the two paginated tabs', () => {
    const tabs: ArchiveTab[] = ['stories', 'audio'];
    expect(tabs).toHaveLength(2);
  });
});
