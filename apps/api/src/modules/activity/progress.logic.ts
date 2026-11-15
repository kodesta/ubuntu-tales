import { DEFAULT_EDITORIAL_TZ, editorialDateKey } from '../../catalogue/story-of-day';

/** Stats anti-inflation caps from production plan 05 §3.9 / 08 §1. */
export const MAX_LISTENED_DELTA_SEC = 60;
/** Completion happens on POST /complete or when the client reports at least this percent. */
export const COMPLETE_THRESHOLD_PERCENT = 95;
/** Tolerance for client/round-trip skew when enforcing wall-clock listening limits. */
const ELAPSED_GRACE_SEC = 5;

export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

/**
 * Caps `listenedDeltaSec` at 60 s per call **and** at the wall-clock elapsed time since the previous
 * accepted write (plus a small grace for network latency), so listening stats cannot be inflated.
 */
export function capListenedDelta(
  requested: number,
  previousUpdatedAt: Date | null,
  now: Date,
  max = MAX_LISTENED_DELTA_SEC,
): number {
  const requestedClamped = Math.min(max, Math.max(0, Math.floor(Number.isFinite(requested) ? requested : 0)));
  if (!previousUpdatedAt) return requestedClamped;

  const elapsedSeconds = Math.max(
    0,
    Math.ceil((now.getTime() - previousUpdatedAt.getTime()) / 1000),
  );
  const allowed = Math.min(max, elapsedSeconds + ELAPSED_GRACE_SEC);
  return Math.min(requestedClamped, allowed);
}

/**
 * Last-write-wins for offline sync: a write whose client timestamp is older than the stored one is
 * ignored. Equal timestamps are accepted so an idempotent retry still updates the listening delta.
 */
export function shouldAcceptWrite(
  previousClientUpdatedAt: Date | null,
  incomingClientUpdatedAt: Date,
): boolean {
  if (!previousClientUpdatedAt) return true;
  return incomingClientUpdatedAt.getTime() >= previousClientUpdatedAt.getTime();
}

/** Resolve the effective IANA timezone (validates the `X-Timezone` header, else editorial default). */
export function resolveTimezone(candidate: string | undefined, fallback = DEFAULT_EDITORIAL_TZ): string {
  if (!candidate) return fallback;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: candidate });
    return candidate;
  } catch {
    return fallback;
  }
}

/** YYYY-MM-DD for an instant in a timezone — the "activity day" used for streaks. */
export function activityDayKey(now: Date, timeZone: string): string {
  return editorialDateKey(now, timeZone);
}

export function previousDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Streak rule: same day keeps the streak, the next calendar day extends it, any gap restarts at 1.
 * The streak is timezone-relative because the reader's local day is what feels like "today".
 */
export function nextStreakDays(
  previous: { currentStreakDays: number; lastActiveDay: Date | null },
  todayKey: string,
): number {
  const previousKey = previous.lastActiveDay
    ? previous.lastActiveDay.toISOString().slice(0, 10)
    : null;

  if (previousKey === todayKey) return Math.max(1, previous.currentStreakDays);
  if (previousKey === previousDayKey(todayKey)) return Math.max(0, previous.currentStreakDays) + 1;
  return 1;
}

/** Parses a cursor date value, returning null when the opaque cursor contains a bad timestamp. */
export function parseCursorDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
