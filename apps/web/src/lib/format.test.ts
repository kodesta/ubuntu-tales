import { describe, expect, it } from 'vitest';

import {
  formatCompactNumber,
  formatLongDate,
  formatReadTime,
  formatReaderCount,
  formatRelativeDate,
  formatShortDate,
  formatTaleCount,
  joinMeta,
} from './format';

describe('format helpers', () => {
  it('formats the editorial long date and short date', () => {
    const date = new Date(2026, 10, 14, 12, 0, 0);
    expect(formatLongDate(date)).toBe('Saturday, 14 November');
    expect(formatShortDate(date)).toBe('14 Nov 2026');
  });

  it('formats relative dates against a fixed now', () => {
    const now = new Date(2026, 10, 14, 12, 0, 0);
    expect(formatRelativeDate(new Date(2026, 10, 14, 8, 0, 0), now)).toBe('Today');
    expect(formatRelativeDate(new Date(2026, 10, 13, 8, 0, 0), now)).toBe('Yesterday');
    expect(formatRelativeDate(new Date(2026, 10, 10, 8, 0, 0), now)).toBe('4 days ago');
  });

  it('formats read time, counts and meta joins', () => {
    expect(formatReadTime(6)).toBe('6 min read');
    expect(formatReadTime(0)).toBe('1 min read');
    expect(formatCompactNumber(12400)).toBe('12.4k');
    expect(formatCompactNumber(999)).toBe('999');
    expect(formatReaderCount(12400)).toBe('12.4k readers');
    expect(formatReaderCount(1)).toBe('1 reader');
    expect(formatTaleCount(1)).toBe('1 tale');
    expect(formatTaleCount(7)).toBe('7 tales');
    expect(joinMeta(['Zulu', undefined, '6 min read'])).toBe('Zulu · 6 min read');
  });
});
