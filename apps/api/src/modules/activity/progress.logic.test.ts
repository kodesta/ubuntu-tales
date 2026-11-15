import { describe, expect, it } from 'vitest';
import {
  MAX_LISTENED_DELTA_SEC,
  activityDayKey,
  capListenedDelta,
  clampPercent,
  nextStreakDays,
  parseCursorDate,
  previousDayKey,
  resolveTimezone,
  shouldAcceptWrite,
} from './progress.logic';

describe('clampPercent', () => {
  it('clamps malformed values into 0..100 and rounds', () => {
    expect(clampPercent(0)).toBe(0);
    expect(clampPercent(50.4)).toBe(50);
    expect(clampPercent(99.6)).toBe(100);
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(150)).toBe(100);
    expect(clampPercent(Number.NaN)).toBe(0);
  });
});

describe('capListenedDelta', () => {
  const now = new Date('2026-01-01T12:00:00.000Z');

  it('caps the first update at the 60-second per-call maximum', () => {
    expect(capListenedDelta(500, null, now)).toBe(MAX_LISTENED_DELTA_SEC);
    expect(capListenedDelta(-10, null, now)).toBe(0);
    expect(capListenedDelta(42, null, now)).toBe(42);
  });

  it('never allows more than real elapsed time plus a small grace window', () => {
    const previous = new Date(now.getTime() - 10_000);
    // 10s elapsed + 5s grace => 15s allowed even though the client claims 60s.
    expect(capListenedDelta(60, previous, now)).toBe(15);
    // A claim below the allowance passes through untouched.
    expect(capListenedDelta(5, previous, now)).toBe(5);
  });

  it('allows the full cap after at least 55 seconds of wall-clock time', () => {
    const previous = new Date(now.getTime() - 60_000);
    expect(capListenedDelta(60, previous, now)).toBe(60);
  });

  it('ignores a future-dated previous write (negative elapsed time)', () => {
    const future = new Date(now.getTime() + 60_000);
    expect(capListenedDelta(30, future, now)).toBe(5);
  });
});

describe('shouldAcceptWrite (last-write-wins)', () => {
  it('accepts writes when there is no stored client timestamp', () => {
    expect(shouldAcceptWrite(null, new Date('2026-01-01T00:00:00Z'))).toBe(true);
  });

  it('accepts newer and equal timestamps, rejects stale offline writes', () => {
    const stored = new Date('2026-01-01T10:00:00.000Z');
    expect(shouldAcceptWrite(stored, new Date('2026-01-01T11:00:00.000Z'))).toBe(true);
    expect(shouldAcceptWrite(stored, new Date('2026-01-01T10:00:00.000Z'))).toBe(true);
    expect(shouldAcceptWrite(stored, new Date('2026-01-01T09:59:59.000Z'))).toBe(false);
  });
});

describe('streaks', () => {
  const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

  it('keeps the streak for the second activity on the same day', () => {
    expect(nextStreakDays({ currentStreakDays: 4, lastActiveDay: day('2026-01-05') }, '2026-01-05')).toBe(
      4,
    );
  });

  it('extends the streak on the next calendar day', () => {
    expect(nextStreakDays({ currentStreakDays: 4, lastActiveDay: day('2026-01-04') }, '2026-01-05')).toBe(
      5,
    );
  });

  it('starts the streak at 1 after a gap or first activity', () => {
    expect(nextStreakDays({ currentStreakDays: 9, lastActiveDay: day('2026-01-01') }, '2026-01-05')).toBe(
      1,
    );
    expect(nextStreakDays({ currentStreakDays: 0, lastActiveDay: null }, '2026-01-05')).toBe(1);
  });

  it('computes the previous day key across month boundaries', () => {
    expect(previousDayKey('2026-01-01')).toBe('2025-12-31');
    expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
  });
});

describe('timezone handling', () => {
  it('accepts valid IANA zones and falls back for junk', () => {
    expect(resolveTimezone('Africa/Johannesburg')).toBe('Africa/Johannesburg');
    expect(resolveTimezone('Not/AZone')).toBe('Africa/Johannesburg');
    expect(resolveTimezone(undefined)).toBe('Africa/Johannesburg');
    expect(resolveTimezone('Not/AZone', 'UTC')).toBe('UTC');
  });

  it('derives the activity day key in the request timezone', () => {
    // 23:30 UTC on 5 Jan is already 01:30 on 6 Jan in Johannesburg (UTC+2).
    const instant = new Date('2026-01-05T23:30:00.000Z');
    expect(activityDayKey(instant, 'UTC')).toBe('2026-01-05');
    expect(activityDayKey(instant, 'Africa/Johannesburg')).toBe('2026-01-06');
  });
});

describe('parseCursorDate', () => {
  it('parses valid ISO timestamps and rejects junk cursors', () => {
    expect(parseCursorDate('2026-01-01T00:00:00.000Z')?.toISOString()).toBe(
      '2026-01-01T00:00:00.000Z',
    );
    expect(parseCursorDate('not-a-date')).toBeNull();
  });
});
