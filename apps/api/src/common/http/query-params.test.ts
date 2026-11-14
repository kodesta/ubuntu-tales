import { describe, expect, it } from 'vitest';
import { AppException } from '../errors/app-exception';
import { encodeCursor } from '../pagination/cursor';
import {
  parseAuthorListQuery,
  parseCursor,
  parseLimit,
  parseRegion,
  parseStoryListQuery,
  parseStorySort,
  readString,
} from './query-params';

function expectAppException(fn: () => unknown, code: string): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe(code);
    return;
  }
  throw new Error('Expected an AppException to be thrown.');
}

describe('query param parsing', () => {
  describe('readString', () => {
    it('trims values and ignores blanks, arrays take the first entry', () => {
      expect(readString('  baobab ')).toBe('baobab');
      expect(readString('   ')).toBeUndefined();
      expect(readString(undefined)).toBeUndefined();
      expect(readString(['zulu', 'yoruba'])).toBe('zulu');
    });
  });

  describe('parseLimit', () => {
    it('defaults to 12', () => {
      expect(parseLimit(undefined)).toBe(12);
    });

    it('parses a valid limit', () => {
      expect(parseLimit('7')).toBe(7);
      expect(parseLimit('50')).toBe(50);
    });

    it('clamps values above the maximum of 50', () => {
      expect(parseLimit('500')).toBe(50);
    });

    it('rejects zero, negatives and non-numeric values', () => {
      expectAppException(() => parseLimit('0'), 'VALIDATION_FAILED');
      expectAppException(() => parseLimit('-3'), 'VALIDATION_FAILED');
      expectAppException(() => parseLimit('twelve'), 'VALIDATION_FAILED');
    });
  });

  describe('parseStorySort', () => {
    it('defaults to recent', () => {
      expect(parseStorySort(undefined)).toBe('recent');
    });

    it('accepts the supported sorts', () => {
      expect(parseStorySort('popular')).toBe('popular');
      expect(parseStorySort('title')).toBe('title');
      expect(parseStorySort('recent')).toBe('recent');
    });

    it('rejects unsupported sorts', () => {
      expectAppException(() => parseStorySort('newest'), 'VALIDATION_FAILED');
    });
  });

  describe('parseRegion', () => {
    it('accepts a known region', () => {
      expect(parseRegion('WEST_AFRICA')).toBe('WEST_AFRICA');
    });

    it('is optional', () => {
      expect(parseRegion(undefined)).toBeUndefined();
    });

    it('rejects unknown regions', () => {
      expectAppException(() => parseRegion('west'), 'VALIDATION_FAILED');
    });
  });

  describe('parseCursor', () => {
    it('is optional', () => {
      expect(parseCursor(undefined)).toBeUndefined();
      expect(parseCursor('')).toBeUndefined();
    });

    it('decodes a valid cursor', () => {
      const encoded = encodeCursor({ v: '2026-11-14T06:00:00.000Z', id: 'story-1' });
      expect(parseCursor(encoded)).toEqual({ v: '2026-11-14T06:00:00.000Z', id: 'story-1' });
    });

    it('rejects a malformed cursor', () => {
      expectAppException(() => parseCursor('%%%'), 'VALIDATION_FAILED');
    });
  });

  describe('parseStoryListQuery', () => {
    it('parses all filters and normalises values', () => {
      const cursor = encodeCursor({ v: 'The Baobab', id: 'story-9' });
      expect(
        parseStoryListQuery({
          q: ' baobab ',
          tribe: 'zulu',
          category: 'wisdom',
          region: 'SOUTHERN_AFRICA',
          sort: 'title',
          limit: '5',
          cursor,
        }),
      ).toEqual({
        q: 'baobab',
        tribe: 'zulu',
        category: 'wisdom',
        region: 'SOUTHERN_AFRICA',
        sort: 'title',
        limit: 5,
        cursor: { v: 'The Baobab', id: 'story-9' },
      });
    });

    it('uses defaults when the query is empty', () => {
      expect(parseStoryListQuery({})).toEqual({
        q: undefined,
        tribe: undefined,
        category: undefined,
        region: undefined,
        sort: 'recent',
        limit: 12,
        cursor: undefined,
      });
    });
  });

  describe('parseAuthorListQuery', () => {
    it('parses q, limit and cursor', () => {
      const cursor = encodeCursor({ v: 'Amina Diallo', id: 'narrator-2' });
      expect(parseAuthorListQuery({ q: 'amina', limit: '3', cursor })).toEqual({
        q: 'amina',
        limit: 3,
        cursor: { v: 'Amina Diallo', id: 'narrator-2' },
      });
    });
  });
});
