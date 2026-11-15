import type { SavedStoryItem, UserMe } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSavedStore } from '@/stores/saved';
import { useSessionStore } from '@/stores/session';
import { sampleStory, sampleStoryThree, sampleStoryTwo } from '@/test/fixtures';

import {
  hydrateSavedFromApi,
  savedItemToEntry,
  toggleSavedWithSync,
} from './savedSync';

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  unsave: vi.fn(),
  list: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      saved: {
        ...actual.api.saved,
        save: mocks.save,
        unsave: mocks.unsave,
        list: mocks.list,
      },
    },
  };
});

const authedUser = {
  id: 'user-kwame',
  email: 'kwame@ubuntutales.local',
  emailVerified: true,
  displayName: 'Kwame Mensah',
  systemRole: 'READER',
  locale: 'en',
  onboarded: true,
  stats: { talesRead: 0, tribesExplored: 0, listeningMinutes: 0, currentStreakDays: 0 },
  createdAt: '2026-11-01T06:00:00.000Z',
} as UserMe;

function signIn() {
  useSessionStore.setState({
    status: 'authenticated',
    user: authedUser,
    accessToken: 'test-token',
    bootPromise: null,
  });
}

function signOut() {
  useSessionStore.setState({
    status: 'guest',
    user: null,
    accessToken: null,
    bootPromise: null,
  });
}

function savedItem(
  story: typeof sampleStory,
  overrides: Partial<SavedStoryItem> = {},
): SavedStoryItem {
  return {
    ...story,
    savedAt: '2026-11-14T06:00:00.000Z',
    progressPercent: 20,
    completed: false,
    reflection: null,
    ...overrides,
  };
}

beforeEach(() => {
  signOut();
  useSavedStore.setState({ entries: [], hydrated: false });
  mocks.save.mockReset();
  mocks.unsave.mockReset();
  mocks.list.mockReset();
  mocks.list.mockResolvedValue({ items: [], nextCursor: null });
  mocks.save.mockResolvedValue({ ok: true });
  mocks.unsave.mockResolvedValue({ ok: true });
});

describe('savedItemToEntry', () => {
  it('keeps the StoryCard snapshot and drops the API-only fields', () => {
    const entry = savedItemToEntry(
      savedItem(sampleStory, { progressPercent: 44, completed: true, reflection: 'JOY' }),
    );

    expect(entry.savedAt).toBe('2026-11-14T06:00:00.000Z');
    expect(entry.story.slug).toBe(sampleStory.slug);
    expect(entry.story).not.toHaveProperty('progressPercent');
    expect(entry.story).not.toHaveProperty('reflection');
  });
});

describe('hydrateSavedFromApi', () => {
  it('is a no-op for guests', async () => {
    await hydrateSavedFromApi();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it('mirrors the account reading list and marks the store hydrated', async () => {
    mocks.list.mockResolvedValue({
      items: [savedItem(sampleStory), savedItem(sampleStoryTwo)],
      nextCursor: null,
    });
    signIn();

    await hydrateSavedFromApi();

    expect(mocks.list).toHaveBeenCalledWith({ filter: 'all', limit: 50 });
    expect(useSavedStore.getState().hydrated).toBe(true);
    expect(useSavedStore.getState().entries.map((entry) => entry.story.slug)).toEqual([
      sampleStory.slug,
      sampleStoryTwo.slug,
    ]);
  });

  it('merges account saves with local guest saves instead of dropping them', async () => {
    useSavedStore.setState({
      entries: [{ story: sampleStoryThree, savedAt: '2026-11-10T06:00:00.000Z' }],
      hydrated: false,
    });
    mocks.list.mockResolvedValue({
      items: [savedItem(sampleStory)],
      nextCursor: null,
    });
    signIn();

    await hydrateSavedFromApi();

    expect(useSavedStore.getState().entries.map((entry) => entry.story.slug)).toEqual([
      sampleStory.slug,
      sampleStoryThree.slug,
    ]);
  });

  it('clears the account mirror when the session ends', async () => {
    mocks.list.mockResolvedValue({ items: [savedItem(sampleStory)], nextCursor: null });
    signIn();
    await hydrateSavedFromApi();
    expect(useSavedStore.getState().entries).toHaveLength(1);

    signOut();

    expect(useSavedStore.getState().entries).toHaveLength(0);
    expect(useSavedStore.getState().hydrated).toBe(false);
  });
});

describe('toggleSavedWithSync', () => {
  it('keeps guests local-only', async () => {
    const outcome = await toggleSavedWithSync(sampleStory, false);

    expect(outcome).toEqual({ saved: true, status: 'guest' });
    expect(useSavedStore.getState().entries[0]?.story.slug).toBe(sampleStory.slug);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it('writes optimistically and rolls back on failure', async () => {
    signIn();
    useSavedStore.setState({ entries: [], hydrated: true });
    mocks.save.mockRejectedValueOnce(new Error('offline'));

    const outcome = await toggleSavedWithSync(sampleStory, false);

    expect(outcome.status).toBe('failed');
    expect(outcome.saved).toBe(false);
    expect(mocks.save).toHaveBeenCalledWith(sampleStory.id);
    expect(useSavedStore.getState().entries).toHaveLength(0);
  });

  it('unsaves through the API and reports success', async () => {
    signIn();
    useSavedStore.setState({ entries: [], hydrated: true });
    useSavedStore.getState().save(sampleStory);

    const outcome = await toggleSavedWithSync(sampleStory, true);

    expect(outcome).toEqual({ saved: false, status: 'synced' });
    expect(mocks.unsave).toHaveBeenCalledWith(sampleStory.id);
    expect(useSavedStore.getState().entries).toHaveLength(0);
  });
});
