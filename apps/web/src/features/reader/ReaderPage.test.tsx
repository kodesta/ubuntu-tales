import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import type { StoryDetail } from '@ubuntu-tales/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sampleStory, sampleStoryTwo, sampleStoryThree } from '@/test/fixtures';

import { ReaderPage } from './ReaderPage';

const mocks = vi.hoisted(() => ({
  getStory: vi.fn(),
  getRecommendations: vi.fn(),
  getStories: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      getStory: mocks.getStory,
      getRecommendations: mocks.getRecommendations,
      getStories: mocks.getStories,
    },
  };
});

const storyDetail: StoryDetail = {
  ...sampleStory,
  body: {
    version: 1,
    paragraphs: [
      {
        id: 'p_01',
        sentences: [
          { id: 's_0001', text: 'When the rains failed, the plain grew quiet.' },
          { id: 's_0002', text: 'The herder kept his promise anyway.' },
        ],
      },
      {
        id: 'p_02',
        sentences: [{ id: 's_0003', text: 'The old tree remembered.' }],
      },
    ],
  },
};

async function renderReader() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });

  const rootRoute = createRootRoute({ component: () => <Outlet /> });
  const storyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/stories/$slug',
    component: () => <ReaderPage slug={storyDetail.slug} />,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  });
  const tribeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/tribes/$slug',
    component: () => null,
  });
  const libraryRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/library',
    component: () => null,
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, storyRoute, tribeRoute, libraryRoute]),
    history: createMemoryHistory({ initialEntries: [`/stories/${storyDetail.slug}`] }),
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
  mocks.getStory.mockResolvedValue(storyDetail);
  mocks.getRecommendations.mockResolvedValue([sampleStoryTwo, sampleStoryThree]);
  const sameTribe = [sampleStoryTwo, sampleStoryThree].map((story) => ({
    ...story,
    tribe: {
      ...story.tribe,
      slug: storyDetail.tribe.slug,
      name: storyDetail.tribe.name,
      accentColor: storyDetail.tribe.accentColor,
    },
  }));
  mocks.getStories.mockResolvedValue({ items: sameTribe, nextCursor: null });
});

describe('ReaderPage', () => {
  it('renders the editorial header and one sentence span per API sentence', async () => {
    await renderReader();

    expect(
      await screen.findByRole('heading', { level: 1, name: storyDetail.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(`Narrated by ${sampleStory.narrator?.name}`)).toBeInTheDocument();

    const spans = [...document.querySelectorAll('[data-sentence-id]')];
    expect(spans).toHaveLength(3);
    expect(spans.map((span) => span.getAttribute('data-sentence-id'))).toEqual([
      's_0001',
      's_0002',
      's_0003',
    ]);
  });

  it('renders the end matter: wisdom, reactions, finish action and more tales', async () => {
    await renderReader();

    expect(await screen.findByText('The wisdom')).toBeInTheDocument();
    expect(screen.getByText(storyDetail.moral ?? '')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'React to this tale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish tale' })).toBeInTheDocument();
    expect(
      await screen.findByText(new RegExp(`More from ${storyDetail.tribe.name}`)),
    ).toBeInTheDocument();
  });
});
