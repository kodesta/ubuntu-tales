import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserMe } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSavedStore } from '@/stores/saved';
import { useSessionStore } from '@/stores/session';
import { ON_DEVICE_NOTE, useToastStore } from '@/stores/toast';
import { sampleStory } from '@/test/fixtures';

import { SaveButton } from './SaveButton';

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
  stats: {
    talesRead: 0,
    tribesExplored: 0,
    listeningMinutes: 0,
    currentStreakDays: 0,
  },
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

function renderButton(story: typeof sampleStory) {
  return render(<SaveButton story={story} />);
}

function toastMessages(): string[] {
  return useToastStore.getState().toasts.map((toast) => toast.message);
}

beforeEach(() => {
  useSavedStore.setState({ entries: [], hydrated: false });
  useToastStore.getState().clear();
  mocks.save.mockReset();
  mocks.unsave.mockReset();
  mocks.list.mockReset();
  mocks.list.mockResolvedValue({ items: [], nextCursor: null });
  mocks.save.mockResolvedValue({ ok: true });
  mocks.unsave.mockResolvedValue({ ok: true });
  signOut();
});

describe('SaveButton — guest', () => {
  it('saves locally with the on-device toast and never calls the API', async () => {
    const user = userEvent.setup();
    renderButton(sampleStory);

    await user.click(screen.getByRole('button', { name: 'Save to your reading list' }));

    expect(mocks.save).not.toHaveBeenCalled();
    expect(useSavedStore.getState().entries[0]?.story.slug).toBe(sampleStory.slug);
    expect(window.localStorage.getItem('ut.saved')).toContain(sampleStory.slug);
    expect(toastMessages()).toContain(ON_DEVICE_NOTE);
  });

  it('unsaves locally and announces the removal', async () => {
    const user = userEvent.setup();
    useSavedStore.getState().save(sampleStory);
    renderButton(sampleStory);

    await user.click(screen.getByRole('button', { name: 'Remove from your reading list' }));

    expect(useSavedStore.getState().entries).toHaveLength(0);
    expect(mocks.unsave).not.toHaveBeenCalled();
    expect(toastMessages()).toContain('Removed from your reading list.');
  });

  it('falls back to the viewer overlay for signed-in stories before the store hydrates', async () => {
    signIn();
    useSavedStore.setState({ entries: [], hydrated: false });
    renderButton({ ...sampleStory, viewer: { saved: true, progressPercent: 0, completed: false } });

    expect(
      screen.getByRole('button', { name: 'Remove from your reading list' }),
    ).toBeInTheDocument();
    // Let the session-driven hydration settle inside act().
    await waitFor(() => expect(useSavedStore.getState().hydrated).toBe(true));
  });
});

describe('SaveButton — signed in', () => {
  it('saves optimistically and persists through PUT /me/saved', async () => {
    const user = userEvent.setup();
    signIn();
    useSavedStore.setState({ entries: [], hydrated: true });
    renderButton(sampleStory);

    await user.click(screen.getByRole('button', { name: 'Save to your reading list' }));

    // Optimistic: the store is updated before the request settles.
    expect(useSavedStore.getState().entries[0]?.story.slug).toBe(sampleStory.slug);
    expect(mocks.save).toHaveBeenCalledWith(sampleStory.id);
    await waitFor(() => expect(toastMessages()).toContain('Saved to your reading list.'));
  });

  it('unsaves optimistically through DELETE /me/saved/:id', async () => {
    const user = userEvent.setup();
    signIn();
    useSavedStore.setState({ entries: [], hydrated: true });
    useSavedStore.getState().save(sampleStory);
    renderButton(sampleStory);

    await user.click(screen.getByRole('button', { name: 'Remove from your reading list' }));

    expect(useSavedStore.getState().entries).toHaveLength(0);
    expect(mocks.unsave).toHaveBeenCalledWith(sampleStory.id);
  });

  it('rolls the optimistic save back and shows an error toast when the API fails', async () => {
    const user = userEvent.setup();
    signIn();
    useSavedStore.setState({ entries: [], hydrated: true });
    mocks.save.mockRejectedValueOnce(new Error('network down'));
    renderButton(sampleStory);

    await user.click(screen.getByRole('button', { name: 'Save to your reading list' }));

    await waitFor(() => expect(useSavedStore.getState().entries).toHaveLength(0));
    await waitFor(() =>
      expect(toastMessages()).toContain(
        'We could not update your reading list. Please try again.',
      ),
    );
  });

  it('restores an unsaved tale when the DELETE fails', async () => {
    const user = userEvent.setup();
    signIn();
    useSavedStore.setState({ entries: [], hydrated: true });
    useSavedStore.getState().save(sampleStory);
    mocks.unsave.mockRejectedValueOnce(new Error('network down'));
    renderButton(sampleStory);

    await user.click(screen.getByRole('button', { name: 'Remove from your reading list' }));

    await waitFor(() =>
      expect(useSavedStore.getState().entries[0]?.story.slug).toBe(sampleStory.slug),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain(
        'We could not update your reading list. Please try again.',
      ),
    );
  });
});
