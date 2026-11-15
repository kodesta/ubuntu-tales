import { describe, expect, it } from 'vitest';

import { chooseRendition, formatClock, nextRate } from './rendition';

const RENDITIONS = [
  { rendition: 'aac_64k' as const, url: '/media/aac_64k.m4a', sizeBytes: 100 },
  { rendition: 'aac_128k' as const, url: '/media/aac_128k.m4a', sizeBytes: 200 },
];

describe('rendition selection', () => {
  it('uses the data-saver encode on save-data or slow connections', () => {
    expect(chooseRendition(RENDITIONS, { saveData: true })?.rendition).toBe('aac_64k');
    expect(chooseRendition(RENDITIONS, { effectiveType: '3g' })?.rendition).toBe('aac_64k');
    expect(chooseRendition(RENDITIONS, { effectiveType: '2g' })?.rendition).toBe('aac_64k');
  });

  it('prefers the full encode on fast connections', () => {
    expect(chooseRendition(RENDITIONS, { effectiveType: '4g' })?.rendition).toBe('aac_128k');
  });

  it('falls back to whatever exists and handles no audio', () => {
    expect(chooseRendition([RENDITIONS[0]!], {})?.rendition).toBe('aac_64k');
    expect(chooseRendition([], {})).toBeUndefined();
    expect(chooseRendition(undefined, {})).toBeUndefined();
  });
});

describe('player helpers', () => {
  it('cycles playback rates', () => {
    expect(nextRate(0.75)).toBe(1);
    expect(nextRate(1)).toBe(1.5);
    expect(nextRate(1.5)).toBe(2);
    expect(nextRate(2)).toBe(0.75);
  });

  it('formats clock values', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(-5)).toBe('0:00');
  });
});
