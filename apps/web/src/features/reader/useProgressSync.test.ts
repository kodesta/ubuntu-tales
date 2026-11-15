import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sampleStory } from '@/test/fixtures';

import { useReadingProgressStore } from './readingProgress';
import { PROGRESS_SYNC_INTERVAL_MS, useProgressSync } from './useProgressSync';

const mocks = vi.hoisted(() => ({
  put: vi.fn(),
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      progress: {
        ...actual.api.progress,
        put: mocks.put,
      },
    },
  };
});

const storyId = 'story-uuid-0001';
const slug = sampleStory.slug;

function renderSync(enabled = true) {
  return renderHook(() => useProgressSync({ storyId, slug, enabled }));
}

function flushInterval() {
  return act(async () => {
    vi.advanceTimersByTime(PROGRESS_SYNC_INTERVAL_MS);
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  useReadingProgressStore.setState({ bySlug: {} });
  mocks.put.mockReset();
  mocks.put.mockResolvedValue({
    progress: { storyId, percent: 0, completed: false, updatedAt: new Date().toISOString() },
    stats: { talesRead: 0, tribesExplored: 0, listeningMinutes: 0, currentStreakDays: 0 },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useProgressSync', () => {
  it('sends the reading marker every ~10 s, but only when it changed', async () => {
    renderSync();

    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 32, lastSentenceId: 's_0002' });
    });
    await flushInterval();

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenCalledWith(
      storyId,
      expect.objectContaining({
        percent: 32,
        lastSentenceId: 's_0002',
        audioPositionMs: 0,
        listenedDeltaSec: 0,
        clientUpdatedAt: useReadingProgressStore.getState().bySlug[slug]?.updatedAt,
      }),
    );

    // No scroll movement → no duplicate write.
    await flushInterval();
    expect(mocks.put).toHaveBeenCalledTimes(1);

    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 48, lastSentenceId: 's_0003' });
    });
    await flushInterval();
    expect(mocks.put).toHaveBeenCalledTimes(2);
  });

  it('always claims zero listening time (never fakes stats)', async () => {
    renderSync();
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 90, lastSentenceId: 's_0009' });
    });
    await flushInterval();

    const [, payload] = mocks.put.mock.calls[0] as [string, Record<string, unknown>];
    expect(payload.audioPositionMs).toBe(0);
    expect(payload.listenedDeltaSec).toBe(0);
  });

  it('clamps the percentage into the 0–100 contract', async () => {
    renderSync();
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 260 });
    });
    await flushInterval();

    expect(mocks.put).toHaveBeenCalledWith(storyId, expect.objectContaining({ percent: 100 }));
  });

  it('does not create progress rows before the reader has moved', async () => {
    renderSync();
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 0 });
    });
    await flushInterval();
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('flushes on visibilitychange:hidden', async () => {
    renderSync();
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 55, lastSentenceId: 's_0004' });
    });

    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    try {
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await act(async () => {
        await Promise.resolve();
      });
    } finally {
      if (original) Object.defineProperty(document, 'visibilityState', original);
      else delete (document as { visibilityState?: unknown }).visibilityState;
    }

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenCalledWith(storyId, expect.objectContaining({ percent: 55 }));
  });

  it('flushes the final marker on unmount', async () => {
    const { unmount } = renderSync();
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 71, lastSentenceId: 's_0007' });
    });

    unmount();
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.put).toHaveBeenCalledTimes(1);
    expect(mocks.put).toHaveBeenCalledWith(storyId, expect.objectContaining({ percent: 71 }));
  });

  it('is a no-op for guests / when disabled', async () => {
    const { unmount } = renderSync(false);
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 40 });
    });
    await flushInterval();
    unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.put).not.toHaveBeenCalled();
  });

  it('retries a failed write on the next interval', async () => {
    mocks.put.mockRejectedValueOnce(new Error('offline'));
    renderSync();
    act(() => {
      useReadingProgressStore.getState().record(slug, { percent: 25 });
    });
    await flushInterval();
    expect(mocks.put).toHaveBeenCalledTimes(1);

    await flushInterval();
    expect(mocks.put).toHaveBeenCalledTimes(2);
  });
});
