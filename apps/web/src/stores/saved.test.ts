import { beforeEach, describe, expect, it } from 'vitest';

import { sampleStory, sampleStoryTwo } from '@/test/fixtures';

import { useSavedStore } from './saved';

function reset() {
  window.localStorage.clear();
  useSavedStore.setState({ entries: [] });
}

describe('saved store (ut.saved)', () => {
  beforeEach(reset);

  it('saves a StoryCard snapshot and persists it to localStorage', () => {
    const nowSaved = useSavedStore.getState().toggle(sampleStory);

    expect(nowSaved).toBe(true);
    expect(useSavedStore.getState().entries).toHaveLength(1);

    const persisted = JSON.parse(window.localStorage.getItem('ut.saved') ?? '{}') as {
      state?: { entries?: Array<{ story: { slug: string }; savedAt: string }> };
    };
    expect(persisted.state?.entries?.[0]?.story.slug).toBe(sampleStory.slug);
    expect(persisted.state?.entries?.[0]?.savedAt).toBeTruthy();
  });

  it('unsaves a tale and keeps newest saves first', () => {
    useSavedStore.getState().save(sampleStory);
    useSavedStore.getState().save(sampleStoryTwo);

    expect(useSavedStore.getState().entries.map((entry) => entry.story.slug)).toEqual([
      sampleStoryTwo.slug,
      sampleStory.slug,
    ]);

    const nowSaved = useSavedStore.getState().toggle(sampleStory);
    expect(nowSaved).toBe(false);
    expect(useSavedStore.getState().entries.map((entry) => entry.story.slug)).toEqual([
      sampleStoryTwo.slug,
    ]);
  });

  it('does not duplicate a tale that is already saved', () => {
    useSavedStore.getState().save(sampleStory);
    useSavedStore.getState().save(sampleStory);
    expect(useSavedStore.getState().entries).toHaveLength(1);
  });
});
