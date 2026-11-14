import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import type { ReactionSummary, StoryDetail, UserMe } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { useReactionsStore } from '@/stores/reactions';
import { useSavedStore } from '@/stores/saved';
import { useSessionStore } from '@/stores/session';
import { sampleStory, sampleStoryTwo, sampleStoryThree } from '@/test/fixtures';

import { CompletePage } from './CompletePage';

const mocks = vi.hoisted(() => ({
  getStory: vi.fn(),
  getRecommendations: vi.fn(),
  complete: vi.fn(),
  reactionSummary: vi.fn(),
  reactionSet: vi.fn(),
  reactionRemove: vi.fn(),
  savedList: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getStory: mocks.getStory,
      getRecommendations: mocks.getRecommendations,
      saved: {
        ...actual.api.saved,
        list: mocks.savedList,
      },
      progress: {
        ...actual.api.progress,
        complete: mocks.complete,
      },
      reactions: {
        ...actual.api.reactions,
        summary: mocks.reactionSummary,
        set: mocks.reactionSet,
        remove: mocks.reactionRemove,
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
  stats: { talesRead: 11, tribesExplored: 4, listeningMinutes: 0, currentStreakDays: 2 },
  createdAt: '2026-11-01T06:00:00.000Z',
} as UserMe;

const storyDetail: StoryDetail = {
  ...sampleStory,
  body: {
    version: 1,
    paragraphs: [
      { id: 'p_01', sentences: [{ id: 's_0001', text: 'The tale is told.' }] },
    ],
  },
};

function summary(total: number, viewer: ReactionSummary['viewer'] = null): ReactionSummary {
  return {
    storyId: storyDetail.id,
    total,
    counts: {
      JOY: viewer === 'JOY' ? total : Math.max(0, total - 1),
      GREAT: 0,
      GOOD: 0,
      THINKING: viewer === 'THINKING' ? total : 0,
      HAPPY: 0,
    },
    viewer,
  };
}

async function renderComplete() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const completeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stories/$slug/complete',
    component: () => <CompletePage slug={storyDetail.slug} />,
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
    routeTree: rootRoute.addChildren([completeRoute, ...stubs]),
    history: createMemoryHistory({ initialEntries: [`/stories/${storyDetail.slug}/complete`] }),
    defaultPendingMinMs: 0,
  });

  await router.load();

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function signOut() {
  useSessionStore.setState({
    status: 'guest',
    user: null,
    accessToken: null,
    bootPromise: null,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  signOut();
  useReactionsStore.setState({ bySlug: {} });
  useReadingProgressStore.setState({ bySlug: {} });
  useSavedStore.setState({ entries: [], hydrated: false });
  mocks.getStory.mockReset();
  mocks.getRecommendations.mockReset();
  mocks.complete.mockReset();
  mocks.reactionSummary.mockReset();
  mocks.reactionSet.mockReset();
  mocks.reactionRemove.mockReset();
  mocks.savedList.mockReset();
  mocks.getStory.mockResolvedValue(storyDetail);
  mocks.getRecommendations.mockResolvedValue([sampleStoryTwo, sampleStoryThree]);
  mocks.savedList.mockResolvedValue({ items: [], nextCursor: null });
  mocks.reactionSummary.mockResolvedValue(summary(0));
  mocks.complete.mockResolvedValue({
    progress: {
      storyId: storyDetail.id,
      percent: 100,
      completed: true,
      completedAt: '2026-11-15T06:00:00.000Z',
      updatedAt: '2026-11-15T06:00:00.000Z',
    },
    stats: { talesRead: 12, tribesExplored: 5, listeningMinutes: 0, currentStreakDays: 3 },
    recommendations: [sampleStoryTwo, sampleStoryThree],
  });
});

describe('CompletePage — guest', () => {
  it('celebrates the finish, shows the wisdom and three recommendations', async () => {
    await renderComplete();

    expect(await screen.findByText('Ubuntu!')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'You have finished this tale.' }),
    ).toBeInTheDocument();
    expect(screen.getByText(`“${storyDetail.moral}”`)).toBeInTheDocument();
    expect(screen.getByText('Three more tales for the fire.')).toBeInTheDocument();
    expect(await screen.findByText(sampleStoryTwo.title)).toBeInTheDocument();
    expect(screen.getByText(sampleStoryThree.title)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share wisdom' })).toBeInTheDocument();
    // Guests still use the catalogue recommendations endpoint.
    expect(mocks.getRecommendations).toHaveBeenCalledWith(storyDetail.slug, expect.anything());
    expect(mocks.complete).not.toHaveBeenCalled();
  });

  it('marks the tale complete and persists reactions locally', async () => {
    const user = userEvent.setup();
    await renderComplete();

    const joy = await screen.findByRole('button', { name: /^Joy/ });
    expect(joy).toHaveAttribute('aria-pressed', 'false');

    await user.click(joy);
    expect(joy).toHaveAttribute('aria-pressed', 'true');
    expect(useReactionsStore.getState().bySlug[storyDetail.slug]).toBe('JOY');
    expect(window.localStorage.getItem('ut.reactions')).toContain('JOY');
    expect(mocks.reactionSet).not.toHaveBeenCalled();

    await user.click(joy);
    expect(useReactionsStore.getState().bySlug[storyDetail.slug]).toBeUndefined();

    await waitFor(() => {
      expect(useReadingProgressStore.getState().bySlug[storyDetail.slug]?.percent).toBe(100);
    });
  });
});

describe('CompletePage — signed in', () => {
  const authedStory: StoryDetail = {
    ...storyDetail,
    viewer: {
      saved: false,
      progressPercent: 100,
      completed: true,
      reaction: 'THINKING',
    },
  };

  beforeEach(() => {
    useSessionStore.setState({
      status: 'authenticated',
      user: authedUser,
      accessToken: 'test-token',
      bootPromise: null,
    });
    mocks.getStory.mockResolvedValue(authedStory);
    mocks.reactionSummary.mockResolvedValue(summary(12, 'THINKING'));
    mocks.reactionSet.mockResolvedValue({
      reaction: 'JOY',
      summary: summary(13, 'JOY'),
    });
    mocks.reactionRemove.mockResolvedValue({ reaction: null, summary: summary(11) });
  });

  it('uses the completion response for stats and recommendations', async () => {
    await renderComplete();

    expect(await screen.findByText(/12 tales read on your account/)).toBeInTheDocument();
    expect(screen.getByText(/3-day reading streak/)).toBeInTheDocument();
    expect(await screen.findByText(sampleStoryTwo.title)).toBeInTheDocument();
    expect(mocks.complete).toHaveBeenCalledWith(storyDetail.id);
    // The catalogue recommendations query is not used when signed in.
    expect(mocks.getRecommendations).not.toHaveBeenCalled();
  });

  it('shows public reaction counts and the viewer’s own reaction', async () => {
    await renderComplete();

    expect(await screen.findByText('12 readers felt this.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Thinking/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('syncs the picked reaction optimistically through the reactions API', async () => {
    const user = userEvent.setup();
    await renderComplete();

    const joy = await screen.findByRole('button', { name: /^Joy/ });
    await user.click(joy);

    expect(joy).toHaveAttribute('aria-pressed', 'true');
    expect(useReactionsStore.getState().bySlug[storyDetail.slug]).toBe('JOY');
    expect(mocks.reactionSet).toHaveBeenCalledWith(storyDetail.id, 'JOY');
    // The summary response repaints the public count.
    expect(await screen.findByText('13 readers felt this.')).toBeInTheDocument();
  });
});
