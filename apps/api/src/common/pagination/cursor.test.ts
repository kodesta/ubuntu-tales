import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, InvalidCursorError } from './cursor';

const RECENT_PAYLOAD = {
  v: '2026-11-14T06:00:00.000Z',
  id: '018f4a4e-1111-7abc-8def-0123456789ab',
};

describe('pagination cursor', () => {
  it('round-trips a recent-sort payload', () => {
    expect(decodeCursor(encodeCursor(RECENT_PAYLOAD))).toEqual(RECENT_PAYLOAD);
  });

  it('produces opaque base64url without padding or URL-unsafe characters', () => {
    const encoded = encodeCursor(RECENT_PAYLOAD);
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('round-trips a title-sort payload containing unicode', () => {
    const payload = { v: 'The Baobab that Kept its Promise — a tale', id: 'story-1' };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('round-trips a popular-sort payload', () => {
    const payload = { v: '0.92000000000000004', id: 'story-2' };
    expect(decodeCursor(encodeCursor(payload))).toEqual(payload);
  });

  it('rejects a value that is not base64url-encoded JSON', () => {
    expect(() => decodeCursor('definitely-not-a-cursor')).toThrow(InvalidCursorError);
  });

  it('rejects JSON without the required fields', () => {
    const encoded = Buffer.from(JSON.stringify({ v: '2026-11-14' }), 'utf8').toString('base64url');
    expect(() => decodeCursor(encoded)).toThrow(InvalidCursorError);
  });

  it('rejects an empty sort value', () => {
    const encoded = Buffer.from(JSON.stringify({ v: '', id: 'story-3' }), 'utf8').toString(
      'base64url',
    );
    expect(() => decodeCursor(encoded)).toThrow(InvalidCursorError);
  });
});
