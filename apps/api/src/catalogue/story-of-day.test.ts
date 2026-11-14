import { describe, expect, it } from 'vitest';
import {
  editorialDateKey,
  hashDateKey,
  pickStoryOfTheDay,
  storyOfTheDayIndex,
} from './story-of-day';

describe('story of the day', () => {
  it('formats the editorial date in Africa/Johannesburg (UTC+2)', () => {
    expect(editorialDateKey(new Date('2026-11-14T22:30:00.000Z'))).toBe('2026-11-15');
    expect(editorialDateKey(new Date('2026-11-14T21:59:59.000Z'))).toBe('2026-11-14');
    expect(editorialDateKey(new Date('2026-11-14T00:30:00.000Z'))).toBe('2026-11-14');
  });

  it('hashes deterministically', () => {
    expect(hashDateKey('2026-11-14')).toBe(hashDateKey('2026-11-14'));
    expect(hashDateKey('2026-11-14')).not.toBe(hashDateKey('2026-11-15'));
  });

  it('picks the same story for the same date and candidate order', () => {
    const candidates = ['story-a', 'story-b', 'story-c', 'story-d'];
    const first = pickStoryOfTheDay('2026-11-14', candidates);
    const second = pickStoryOfTheDay('2026-11-14', [...candidates]);

    expect(first).not.toBeNull();
    expect(second).toBe(first);
    expect(candidates).toContain(first);
  });

  it('returns an index within bounds for any date', () => {
    for (const dateKey of ['2026-01-01', '2026-02-28', '2026-06-15', '2026-12-31']) {
      const index = storyOfTheDayIndex(dateKey, 7);
      expect(index).not.toBeNull();
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(7);
    }
  });

  it('returns null for an empty candidate list', () => {
    expect(storyOfTheDayIndex('2026-11-14', 0)).toBeNull();
    expect(pickStoryOfTheDay('2026-11-14', [])).toBeNull();
  });

  it('usually varies across consecutive dates for a small pool', () => {
    const candidates = Array.from({ length: 18 }, (_, index) => `story-${index}`);
    const picks = new Set(
      Array.from({ length: 30 }, (_, offset) => {
        const day = String((offset % 28) + 1).padStart(2, '0');
        return pickStoryOfTheDay(`2026-03-${day}`, candidates);
      }),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});
