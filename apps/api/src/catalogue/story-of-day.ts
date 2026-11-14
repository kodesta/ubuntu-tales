/** Story-of-the-day selection: a deterministic fallback shared by the API (seed has an equivalent). */

export const DEFAULT_EDITORIAL_TZ = 'Africa/Johannesburg';

/** `YYYY-MM-DD` for the given instant in the editorial timezone. */
export function editorialDateKey(now: Date, timeZone = DEFAULT_EDITORIAL_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** FNV-1a — small, stable, dependency-free hash. */
export function hashDateKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic index in `[0, count)` (or `null` for an empty candidate list). */
export function storyOfTheDayIndex(dateKey: string, count: number): number | null {
  if (count <= 0) return null;
  return hashDateKey(dateKey) % count;
}

/** Deterministic fallback pick: same date + same candidate order always yields the same story. */
export function pickStoryOfTheDay<T>(dateKey: string, candidates: readonly T[]): T | null {
  const index = storyOfTheDayIndex(dateKey, candidates.length);
  if (index === null) return null;
  return candidates[index] ?? null;
}
