import { describe, expect, it } from 'vitest';

import { activeSentenceId, findActiveTiming, startOfTiming } from './readAlong';

const TIMINGS = [
  { sentenceId: 's_0001', startMs: 0, endMs: 4000 },
  { sentenceId: 's_0002', startMs: 4000, endMs: 9000 },
  { sentenceId: 's_0003', startMs: 9000, endMs: 12000 },
  { sentenceId: 's_0004', startMs: 12000, endMs: 18000 },
];

describe('read-along timing search', () => {
  it('returns -1 before the first timing or without timings', () => {
    expect(findActiveTiming(TIMINGS, -1)).toBe(-1);
    expect(findActiveTiming([], 1000)).toBe(-1);
    expect(findActiveTiming(undefined, 1000)).toBe(-1);
  });

  it('finds the sentence at exact boundaries', () => {
    expect(activeSentenceId(TIMINGS, 0)).toBe('s_0001');
    expect(activeSentenceId(TIMINGS, 3999)).toBe('s_0001');
    expect(activeSentenceId(TIMINGS, 4000)).toBe('s_0002');
    expect(activeSentenceId(TIMINGS, 9000)).toBe('s_0003');
  });

  it('finds the sentence inside a span and clamps past the end', () => {
    expect(activeSentenceId(TIMINGS, 6500)).toBe('s_0002');
    expect(activeSentenceId(TIMINGS, 999999)).toBe('s_0004');
  });

  it('exposes the start time of a sentence for tap-to-seek', () => {
    expect(startOfTiming(TIMINGS, 's_0003')).toBe(9000);
    expect(startOfTiming(TIMINGS, 'missing')).toBeNull();
  });
});
