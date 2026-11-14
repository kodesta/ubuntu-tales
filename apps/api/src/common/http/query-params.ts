import {
  DEFAULT_PAGE_SIZE,
  ERROR_CODES,
  MAX_PAGE_SIZE,
  REGIONS,
  STORY_SORTS,
  type Region,
  type StorySort,
} from '@ubuntu-tales/shared';
import { AppException } from '../errors/app-exception';
import { decodeCursor, InvalidCursorError, type CursorPayload } from '../pagination/cursor';

/** Query params arrive as `string | string[] | undefined` from Fastify. */
export type RawQuery = Record<string, unknown>;

/** Read a single trimmed string query value, ignoring blanks and repeated params. */
export function readString(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? undefined : trimmed.slice(0, 200);
}

/** Default 12, maximum 50 (production plan 02/03); malformed values are a 400. */
export function parseLimit(value: unknown, fallback = DEFAULT_PAGE_SIZE): number {
  const raw = readString(value);
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw)) {
    throw AppException.validation('limit must be a positive integer.', [
      { field: 'limit', message: 'Must be a positive integer.' },
    ]);
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw AppException.validation('limit must be a positive integer.', [
      { field: 'limit', message: 'Must be a positive integer.' },
    ]);
  }
  return Math.min(parsed, MAX_PAGE_SIZE);
}

export function parseStorySort(value: unknown): StorySort {
  const raw = readString(value);
  if (raw === undefined) return 'recent';
  if (!(STORY_SORTS as readonly string[]).includes(raw)) {
    throw AppException.validation(`sort must be one of: ${STORY_SORTS.join(', ')}.`, [
      { field: 'sort', message: `Must be one of: ${STORY_SORTS.join(', ')}.` },
    ]);
  }
  return raw as StorySort;
}

export function parseRegion(value: unknown): Region | undefined {
  const raw = readString(value);
  if (raw === undefined) return undefined;
  if (!(REGIONS as readonly string[]).includes(raw)) {
    throw AppException.validation(`region must be one of: ${REGIONS.join(', ')}.`, [
      { field: 'region', message: `Must be one of: ${REGIONS.join(', ')}.` },
    ]);
  }
  return raw as Region;
}

export function parseCursor(value: unknown): CursorPayload | undefined {
  const raw = readString(value);
  if (raw === undefined) return undefined;
  try {
    return decodeCursor(raw);
  } catch (error) {
    if (error instanceof InvalidCursorError) {
      throw new AppException(
        ERROR_CODES.VALIDATION_FAILED,
        400,
        'The pagination cursor is invalid.',
        [{ field: 'cursor', message: 'Invalid cursor.' }],
      );
    }
    throw error;
  }
}

export interface StoryListParams {
  q?: string;
  tribe?: string;
  category?: string;
  region?: Region;
  sort: StorySort;
  limit: number;
  cursor?: CursorPayload;
}

export function parseStoryListQuery(raw: RawQuery): StoryListParams {
  return {
    q: readString(raw.q),
    tribe: readString(raw.tribe),
    category: readString(raw.category),
    region: parseRegion(raw.region),
    sort: parseStorySort(raw.sort),
    limit: parseLimit(raw.limit),
    cursor: parseCursor(raw.cursor),
  };
}

export interface AuthorListParams {
  q?: string;
  limit: number;
  cursor?: CursorPayload;
}

export function parseAuthorListQuery(raw: RawQuery): AuthorListParams {
  return {
    q: readString(raw.q),
    limit: parseLimit(raw.limit),
    cursor: parseCursor(raw.cursor),
  };
}
