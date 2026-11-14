import { describe, expect, it } from 'vitest';
import {
  countDistinctTribes,
  emptyReactionCounts,
  toListeningMinutes,
  toProgressState,
  toReactionSummary,
  toStatsSummary,
  topReactionType,
} from './activity.mapper';

describe('reaction summaries', () => {
  it('always returns all five reaction types, including zeroes', () => {
    const counts = emptyReactionCounts();
    expect(Object.keys(counts).sort()).toEqual(['GOOD', 'GREAT', 'HAPPY', 'JOY', 'THINKING']);
    expect(Object.values(counts).every((count) => count === 0)).toBe(true);
  });

  it('totals counts and omits `viewer` for guests', () => {
    const summary = toReactionSummary('story-1', { JOY: 3, GOOD: 2 });
    expect(summary.storyId).toBe('story-1');
    expect(summary.total).toBe(5);
    expect(summary.counts.JOY).toBe(3);
    expect(summary.counts.GREAT).toBe(0);
    expect(summary).not.toHaveProperty('viewer');
  });

  it('includes the viewer reaction (or null) for signed-in readers', () => {
    expect(toReactionSummary('story-1', {}, 'HAPPY')).toMatchObject({ viewer: 'HAPPY', total: 0 });
    expect(toReactionSummary('story-1', {}, null)).toMatchObject({ viewer: null });
  });

  it('ignores negative/non-numeric counts defensively', () => {
    const summary = toReactionSummary('story-1', { JOY: -2, GOOD: 1.9 });
    expect(summary.counts.JOY).toBe(0);
    expect(summary.counts.GOOD).toBe(1);
    expect(summary.total).toBe(1);
  });

  it('picks the highest-count reaction, defaulting to JOY on an empty story', () => {
    expect(topReactionType({ ...emptyReactionCounts(), THINKING: 4, JOY: 1 })).toBe('THINKING');
    expect(topReactionType(emptyReactionCounts())).toBe('JOY');
  });
});

describe('progress mapping', () => {
  it('maps an in-progress row and omits optional completion fields', () => {
    const state = toProgressState({
      storyId: 'story-1',
      percent: 42,
      lastSentenceId: 's_0012',
      completedAt: null,
      updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    });
    expect(state).toEqual({
      storyId: 'story-1',
      percent: 42,
      lastSentenceId: 's_0012',
      completed: false,
      updatedAt: '2026-01-01T10:00:00.000Z',
    });
  });

  it('includes completedAt for completed stories', () => {
    const state = toProgressState({
      storyId: 'story-1',
      percent: 100,
      lastSentenceId: null,
      completedAt: new Date('2026-01-02T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    expect(state.completed).toBe(true);
    expect(state.completedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(state.lastSentenceId).toBeUndefined();
  });
});

describe('stats mapping', () => {
  it('converts listening seconds to whole minutes', () => {
    expect(toListeningMinutes(0)).toBe(0);
    expect(toListeningMinutes(59)).toBe(0);
    expect(toListeningMinutes(60)).toBe(1);
    expect(toListeningMinutes(3599)).toBe(59);
    expect(toListeningMinutes(-4)).toBe(0);
  });

  it('maps the stats summary used by celebration cards', () => {
    expect(
      toStatsSummary({
        talesRead: 3,
        tribesExplored: 2,
        listeningSeconds: 600,
        currentStreakDays: 4,
      }),
    ).toEqual({ talesRead: 3, tribesExplored: 2, listeningMinutes: 10, currentStreakDays: 4 });
  });

  it('counts distinct completed tribes plus the account tribe', () => {
    expect(countDistinctTribes(['zulu', 'zulu', 'shona'], 'ashanti')).toBe(3);
    expect(countDistinctTribes([], null)).toBe(0);
    expect(countDistinctTribes(['zulu', null, undefined], 'zulu')).toBe(1);
  });
});
