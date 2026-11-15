import type { SentenceTiming } from '@ubuntu-tales/shared';

/**
 * Index of the sentence being narrated at `positionMs`, or -1 when the position is before the
 * first timing / the narration is untimed. Timings are sorted by startMs; binary search keeps this
 * O(log n) on every timeupdate (production plan 06 §5.2).
 */
export function findActiveTiming(
  timings: SentenceTiming[] | undefined,
  positionMs: number,
): number {
  if (!timings || timings.length === 0) return -1;
  if (positionMs < (timings[0]?.startMs ?? 0)) return -1;

  let low = 0;
  let high = timings.length - 1;
  let answer = 0;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    const timing = timings[mid];
    if (!timing) break;
    if (positionMs >= timing.startMs) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer;
}

export function activeSentenceId(
  timings: SentenceTiming[] | undefined,
  positionMs: number,
): string | null {
  const index = findActiveTiming(timings, positionMs);
  return index >= 0 ? (timings?.[index]?.sentenceId ?? null) : null;
}

/** Start of the next sentence at/after the given position (used by "skip forward to sentence"). */
export function startOfTiming(timings: SentenceTiming[] | undefined, sentenceId: string): number | null {
  const timing = timings?.find((entry) => entry.sentenceId === sentenceId);
  return timing ? timing.startMs : null;
}
