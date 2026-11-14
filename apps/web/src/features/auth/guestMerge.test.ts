import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { useSavedStore } from '@/stores/saved';
import { useTribeStore } from '@/stores/tribe';
import { sampleStory, sampleStoryThree, sampleStoryTwo, sampleTribe } from '@/test/fixtures';

import { describeGuestMerge, mergeGuestData } from './guestMerge';
import { makeUser } from './test-utils';

const mocks = vi.hoisted(() => ({
  getTribes: vi.fn(),
  getStory: vi.fn(),
  updateMe: vi.fn(),
  completeOnboarding: vi.fn(),
  saveStory: vi.fn(),
  putProgress: vi.fn(),
  completeStory: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getTribes: mocks.getTribes,
      getStory: mocks.getStory,
      me: {
        ...actual.api.me,
        update: mocks.updateMe,
        completeOnboarding: mocks.completeOnboarding,
      },
      saved: { ...actual.api.saved, save: mocks.saveStory },
      progress: {
        ...actual.api.progress,
        put: mocks.putProgress,
        complete: mocks.completeStory,
      },
    },
  };
});

function seedGuestState(): void {
  useTribeStore.getState().setTribe({ slug: 'zulu', name: 'Zulu' });
  useSavedStore.getState().save(sampleStory);
  useSavedStore.getState().save(sampleStoryTwo);
  useReadingProgressStore.getState().record(sampleStory.slug, {
    percent: 42,
    lastSentenceId: 's_0004',
  });
}

beforeEach(() => {
  useTribeStore.setState({ slug: null, name: null });
  useSavedStore.setState({ entries: [] });
  useReadingProgressStore.setState({ bySlug: {} });

  mocks.getTribes.mockReset();
  mocks.getStory.mockReset();
  mocks.updateMe.mockReset();
  mocks.completeOnboarding.mockReset();
  mocks.saveStory.mockReset();
  mocks.putProgress.mockReset();
  mocks.completeStory.mockReset();

  mocks.getTribes.mockResolvedValue([{ id: sampleTribe.id, slug: 'zulu', name: 'Zulu' }]);
  mocks.updateMe.mockResolvedValue(makeUser({ tribe: sampleTribe }));
  mocks.completeOnboarding.mockResolvedValue(makeUser({ onboarded: true }));
  mocks.saveStory.mockResolvedValue({ ok: true });
  mocks.putProgress.mockResolvedValue({ progress: {}, stats: {} });
  mocks.completeStory.mockResolvedValue({});
});

describe('mergeGuestData', () => {
  it('moves roots, saved tales and reading positions into the account and clears what moved', async () => {
    seedGuestState();

    const summary = await mergeGuestData(makeUser({ onboarded: false }));

    expect(summary.tribe).toBe('merged');
    expect(summary.saved).toEqual({ merged: 2, failed: 0 });
    expect(summary.progress).toEqual({ merged: 1, failed: 0 });

    expect(mocks.updateMe).toHaveBeenCalledWith({ tribeId: sampleTribe.id });
    expect(mocks.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(mocks.saveStory).toHaveBeenCalledWith(sampleStory.id);
    expect(mocks.saveStory).toHaveBeenCalledWith(sampleStoryTwo.id);
    expect(mocks.putProgress).toHaveBeenCalledWith(sampleStory.id, {
      percent: 42,
      lastSentenceId: 's_0004',
      audioPositionMs: 0,
      listenedDeltaSec: 0,
      clientUpdatedAt: expect.any(String),
    });

    // Only successfully merged local data is cleared.
    expect(useSavedStore.getState().entries).toEqual([]);
    expect(useTribeStore.getState().slug).toBeNull();
    expect(useReadingProgressStore.getState().bySlug).toEqual({});
  });

  it('keeps failed saves on the device and reports them', async () => {
    seedGuestState();
    mocks.saveStory.mockImplementation((storyId: string) =>
      storyId === sampleStoryTwo.id
        ? Promise.reject(new Error('network'))
        : Promise.resolve({ ok: true }),
    );

    const summary = await mergeGuestData(makeUser());

    expect(summary.saved).toEqual({ merged: 1, failed: 1 });
    const remaining = useSavedStore.getState().entries;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.story.id).toBe(sampleStoryTwo.id);
    expect(describeGuestMerge(summary)).toMatch(/1 could not be moved/i);
  });

  it('keeps the account publication when the account already has roots', async () => {
    seedGuestState();

    const summary = await mergeGuestData(makeUser({ tribe: sampleTribe }));

    expect(summary.tribe).toBe('kept');
    expect(mocks.updateMe).not.toHaveBeenCalled();
    expect(useTribeStore.getState().slug).toBeNull();
  });

  it('resolves progress for tales that were never saved on the device', async () => {
    useReadingProgressStore.getState().record(sampleStoryThree.slug, { percent: 10 });
    mocks.getStory.mockResolvedValue({ id: sampleStoryThree.id });

    const summary = await mergeGuestData(makeUser());

    expect(mocks.getStory).toHaveBeenCalledWith(sampleStoryThree.slug);
    expect(mocks.putProgress).toHaveBeenCalledWith(
      sampleStoryThree.id,
      expect.objectContaining({ percent: 10 }),
    );
    expect(summary.progress).toEqual({ merged: 1, failed: 0 });
  });

  it('marks locally finished tales complete (idempotent) after saving the position', async () => {
    useSavedStore.getState().save(sampleStoryTwo);
    useReadingProgressStore.getState().markComplete(sampleStoryTwo.slug);

    await mergeGuestData(makeUser());

    expect(mocks.putProgress).toHaveBeenCalledWith(
      sampleStoryTwo.id,
      expect.objectContaining({ percent: 100 }),
    );
    expect(mocks.completeStory).toHaveBeenCalledWith(sampleStoryTwo.id);
  });

  it('does nothing when there is no guest data', async () => {
    const summary = await mergeGuestData(makeUser());

    expect(summary).toEqual({
      tribe: 'none',
      saved: { merged: 0, failed: 0 },
      progress: { merged: 0, failed: 0 },
    });
    expect(mocks.updateMe).not.toHaveBeenCalled();
    expect(mocks.saveStory).not.toHaveBeenCalled();
    expect(mocks.putProgress).not.toHaveBeenCalled();
  });

  it('never throws when the network fails on roots lookup', async () => {
    seedGuestState();
    mocks.getTribes.mockRejectedValue(new Error('offline'));

    const summary = await mergeGuestData(makeUser());

    expect(summary.tribe).toBe('failed');
    expect(mocks.saveStory).toHaveBeenCalledTimes(2);
    expect(useTribeStore.getState().slug).toBe('zulu');
  });
});

describe('describeGuestMerge', () => {
  it('stays quiet when nothing moved', () => {
    expect(
      describeGuestMerge({
        tribe: 'none',
        saved: { merged: 0, failed: 0 },
        progress: { merged: 0, failed: 0 },
      }),
    ).toBeNull();
  });

  it('summarises a clean merge warmly', () => {
    expect(
      describeGuestMerge({
        tribe: 'merged',
        saved: { merged: 2, failed: 0 },
        progress: { merged: 1, failed: 0 },
      }),
    ).toBe('Your roots, saved tales and reading place are now on your account.');
  });

  it('explains a total failure without losing trust', () => {
    expect(
      describeGuestMerge({
        tribe: 'failed',
        saved: { merged: 0, failed: 0 },
        progress: { merged: 0, failed: 0 },
      }),
    ).toMatch(/still saved on this device/i);
  });
});
