import { QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SavedFilter, SavedStoryItem, StoryCard, UserMe } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { queryClient } from '@/lib/query-client';
import { useSavedStore } from '@/stores/saved';
import { useSessionStore } from '@/stores/session';
import { sampleStory, sampleStoryThree, sampleStoryTwo } from '@/test/fixtures';

import { SavedPage } from './SavedPage';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  unsave: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      saved: {
        ...actual.api.saved,
        list: mocks.list,
        save: mocks.save,
        unsave: mocks.unsave,
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

function savedItem(story: StoryCard, overrides: Partial<SavedStoryItem> = {}): SavedStoryItem {
  return {
    ...story,
    savedAt: '2026-11-14T06:00:00.000Z',
    progressPercent: 0,
    completed: false,
    reflection: null,
    ...overrides,
  };
}

const inProgressItem = savedItem(sampleStory, {
  progressPercent: 32,
  reflection: 'JOY',
});
const completedItem = savedItem(sampleStoryTwo, {
  progressPercent: 100,
  completed: true,
});
const thirdItem = savedItem(sampleStoryThree, { progressPercent: 8 });

async function renderSavedPage() {
  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const savedRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/saved',
    validateSearch: (search: Record<string, unknown>) => ({
      filter: search.filter as SavedFilter | undefined,
    }),
    component: SavedPage,
  });
  const stubs = [
    createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null }),
    createRoute({ getParentRoute: () => rootRoute, path: '/library', component: () => null }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/stories/$slug',
      component: () => null,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/tribes/$slug',
      component: () => null,
    }),
  ];

  const router = createRouter({
    routeTree: rootRoute.addChildren([savedRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: ['/saved'] }),
    defaultPendingMinMs: 0,
  });
  await router.load();

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  queryClient.clear();
  signOut();
  useSavedStore.setState({ entries: [], hydrated: false });
  useReadingProgressStore.setState({ bySlug: {} });
  mocks.list.mockReset();
  mocks.save.mockReset();
  mocks.unsave.mockReset();
  mocks.save.mockResolvedValue({ ok: true });
  mocks.unsave.mockResolvedValue({ ok: true });
  mocks.list.mockResolvedValue({ items: [], nextCursor: null });
});

describe('SavedPage — guest', () => {
  it('keeps the on-device snapshot list with local progress and continue links', async () => {
    useSavedStore.setState({
      entries: [{ story: sampleStory, savedAt: '2026-11-14T06:00:00.000Z' }],
      hydrated: false,
    });
    useReadingProgressStore.getState().record(sampleStory.slug, { percent: 40 });

    await renderSavedPage();

    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    expect(screen.getByText(sampleStory.title)).toBeInTheDocument();
    expect(screen.getByText('40% read')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue reading' })).toBeInTheDocument();
    // Guests never hit the account list.
    expect(mocks.list).not.toHaveBeenCalledWith(expect.objectContaining({ filter: 'all' }));
  });

  it('shows the empty state when nothing is saved', async () => {
    await renderSavedPage();
    expect(screen.getByText('Nothing saved yet.')).toBeInTheDocument();
  });
});

describe('SavedPage — signed in', () => {
  beforeEach(() => {
    mocks.list.mockImplementation(
      (query: { filter?: SavedFilter; cursor?: string | null; limit?: number }) => {
        if (query.filter === 'in-progress') {
          return Promise.resolve({ items: [inProgressItem], nextCursor: null });
        }
        if (query.cursor === 'page-2') {
          return Promise.resolve({ items: [thirdItem], nextCursor: null });
        }
        if (query.limit === 12) {
          return Promise.resolve({ items: [inProgressItem, completedItem], nextCursor: 'page-2' });
        }
        // Store hydration page (limit 50).
        return Promise.resolve({
          items: [inProgressItem, completedItem],
          nextCursor: null,
        });
      },
    );
    signIn();
  });

  it('renders the account list with progress hairlines, reflection tags and cursor pagination', async () => {
    await renderSavedPage();

    expect(await screen.findByText(sampleStory.title)).toBeInTheDocument();
    expect(screen.getByText(/saved on your account/i)).toBeInTheDocument();
    // API progress drives the hairline for started-but-unfinished tales only.
    expect(screen.getByText('32% read')).toBeInTheDocument();
    // Reflection tag from `SavedStoryItem.reflection`.
    expect(screen.getByText(/Joy/)).toBeInTheDocument();
    // jsdom has no IntersectionObserver: the manual cursor fallback loads page 2.
    await userEvent.setup().click(screen.getByRole('button', { name: 'Load more tales' }));
    expect(await screen.findByText(sampleStoryThree.title)).toBeInTheDocument();
  });

  it('requests the In progress filter from the API', async () => {
    const user = userEvent.setup();
    await renderSavedPage();
    await screen.findByText(sampleStory.title);

    await user.click(screen.getByRole('button', { name: 'In progress' }));

    await waitFor(() =>
      expect(mocks.list).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'in-progress', limit: 12 }),
      ),
    );
    expect(await screen.findByText(sampleStory.title)).toBeInTheDocument();
    expect(screen.queryByText(sampleStoryTwo.title)).not.toBeInTheDocument();
  });

  it('hydrates the saved store so save icons agree everywhere', async () => {
    await renderSavedPage();

    await waitFor(() => expect(useSavedStore.getState().hydrated).toBe(true));
    expect(useSavedStore.getState().entries.map((entry) => entry.story.slug)).toContain(
      sampleStory.slug,
    );
  });

  it('unsaves instantly from the account list via DELETE /me/saved/:id', async () => {
    const user = userEvent.setup();
    await renderSavedPage();
    await screen.findByText(sampleStory.title);

    await user.click(
      screen.getAllByRole('button', { name: 'Remove from your reading list' })[0]!,
    );

    expect(mocks.unsave).toHaveBeenCalledWith(sampleStory.id);
    await waitFor(() =>
      expect(screen.queryByText(sampleStory.title)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(sampleStoryTwo.title)).toBeInTheDocument();
  });
});
