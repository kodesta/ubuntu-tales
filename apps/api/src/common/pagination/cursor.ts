/**
 * Opaque keyset pagination cursor (production plan 05 §3.5).
 *
 * The payload is `{ v, id }` where `v` is the row's sort value (publishedAt ISO string,
 * popularity score as a string, or title) and `id` breaks ties. It is base64url-encoded so clients
 * treat it as opaque and cannot craft an injection vector.
 */

export interface CursorPayload {
  /** Sort value of the last row on the page. */
  v: string;
  /** UUID of the last row on the page. */
  id: string;
}

export class InvalidCursorError extends Error {
  constructor() {
    super('The pagination cursor is invalid.');
    this.name = 'InvalidCursorError';
  }
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify({ v: payload.v, id: payload.id }), 'utf8').toString(
    'base64url',
  );
}

export function decodeCursor(raw: string): CursorPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError();
  }

  if (typeof parsed !== 'object' || parsed === null) throw new InvalidCursorError();
  const candidate = parsed as Record<string, unknown>;
  if (typeof candidate.v !== 'string' || typeof candidate.id !== 'string') {
    throw new InvalidCursorError();
  }
  if (candidate.v.length === 0 || candidate.id.length === 0 || candidate.id.length > 64) {
    throw new InvalidCursorError();
  }

  return { v: candidate.v, id: candidate.id };
}
