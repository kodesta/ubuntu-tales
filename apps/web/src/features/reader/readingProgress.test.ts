import { beforeEach, describe, expect, it } from 'vitest';

import {
  calculateReadingPercent,
  isInProgress,
  useReadingProgressStore,
  type ReadingProgress,
} from './readingProgress';

function progress(overrides: Partial<ReadingProgress> = {}): ReadingProgress {
  return {
    percent: 0,
    updatedAt: '2026-11-14T06:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  useReadingProgressStore.setState({ bySlug: {} });
});

describe('calculateReadingPercent', () => {
  it('is 0 at the top and 100 at the bottom of a scrolling document', () => {
    expect(
      calculateReadingPercent({ scrollTop: 0, scrollHeight: 2000, clientHeight: 1000 }),
    ).toBe(0);
    expect(
      calculateReadingPercent({ scrollTop: 1000, scrollHeight: 2000, clientHeight: 1000 }),
    ).toBe(100);
  });

  it('rounds a mid-document position to a whole percentage', () => {
    expect(
      calculateReadingPercent({ scrollTop: 250, scrollHeight: 2000, clientHeight: 1000 }),
    ).toBe(25);
    expect(
      calculateReadingPercent({ scrollTop: 333, scrollHeight: 2000, clientHeight: 1000 }),
    ).toBe(33);
  });

  it('treats a tale that fits on screen as fully read', () => {
    expect(
      calculateReadingPercent({ scrollTop: 0, scrollHeight: 900, clientHeight: 900 }),
    ).toBe(100);
  });

  it('clamps values outside the scroll range', () => {
    expect(
      calculateReadingPercent({ scrollTop: 5000, scrollHeight: 2000, clientHeight: 1000 }),
    ).toBe(100);
    expect(
      calculateReadingPercent({ scrollTop: -120, scrollHeight: 2000, clientHeight: 1000 }),
    ).toBe(0);
  });

  it('returns 0 for non-finite metrics', () => {
    expect(
      calculateReadingPercent({
        scrollTop: Number.NaN,
        scrollHeight: 2000,
        clientHeight: 1000,
      }),
    ).toBe(0);
  });
});

describe('reading progress store', () => {
  it('records percent and last sentence id, and persists them locally', () => {
    useReadingProgressStore.getState().record('the-baobab', {
      percent: 42.6,
      lastSentenceId: 's_0007',
    });

    const saved = useReadingProgressStore.getState().bySlug['the-baobab'];
    expect(saved?.percent).toBe(43);
    expect(saved?.lastSentenceId).toBe('s_0007');
    expect(window.localStorage.getItem('ut.progress')).toContain('"s_0007"');
  });

  it('does not rewrite identical progress', () => {
    const { record } = useReadingProgressStore.getState();
    record('the-baobab', { percent: 10, lastSentenceId: 's_0002' });

    const first = useReadingProgressStore.getState().bySlug['the-baobab'];
    record('the-baobab', { percent: 10, lastSentenceId: 's_0002' });

    expect(useReadingProgressStore.getState().bySlug['the-baobab']).toBe(first);
  });

  it('marks a tale complete with 100 percent', () => {
    useReadingProgressStore.getState().markComplete('the-baobab');

    expect(useReadingProgressStore.getState().bySlug['the-baobab']?.percent).toBe(100);
    expect(isInProgress(useReadingProgressStore.getState().bySlug['the-baobab'])).toBe(false);
  });
});

describe('isInProgress', () => {
  it('is only true between started and finished', () => {
    expect(isInProgress(undefined)).toBe(false);
    expect(isInProgress(progress({ percent: 0 }))).toBe(false);
    expect(isInProgress(progress({ percent: 1 }))).toBe(true);
    expect(isInProgress(progress({ percent: 99 }))).toBe(true);
    expect(isInProgress(progress({ percent: 100 }))).toBe(false);
  });
});
