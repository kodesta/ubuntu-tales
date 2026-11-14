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
import type { StoryDetail } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { useReactionsStore } from '@/stores/reactions';
import { sampleStory, sampleStoryTwo, sampleStoryThree } from '@/test/fixtures';

import { CompletePage } from './CompletePage';

const mocks = vi.hoisted(() => ({
  getStory: vi.fn(),
  getRecommendations: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getStory: mocks.getStory,
      getRecommendations: mocks.getRecommendations,
    },
  };
});

const storyDetail: StoryDetail = {
  ...sampleStory,
  body: {
    version: 1,
    paragraphs: [
      { id: 'p_01', sentences: [{ id: 's_0001', text: 'The tale is told.' }] },
    ],
  },
};

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
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => null,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/library',
      component: () => null,
    }),
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

beforeEach(() => {
  window.localStorage.clear();
  useReactionsStore.setState({ bySlug: {} });
  useReadingProgressStore.setState({ bySlug: {} });
  mocks.getStory.mockResolvedValue(storyDetail);
  mocks.getRecommendations.mockResolvedValue([sampleStoryTwo, sampleStoryThree]);
});

describe('CompletePage', () => {
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

    await user.click(joy);
    expect(useReactionsStore.getState().bySlug[storyDetail.slug]).toBeUndefined();

    await waitFor(() => {
      expect(useReadingProgressStore.getState().bySlug[storyDetail.slug]?.percent).toBe(100);
    });
  });
});
