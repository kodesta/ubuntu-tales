import { createHash } from 'node:crypto';

/**
 * HIBP k-anonymity support (production plan 05 §3.2 / 08 §1).
 *
 * Only the first five hex characters of the SHA-1 digest leave the process; the response contains
 * suffixes and breach counts. The check fails **open** on network errors/timeouts so an HIBP outage
 * never blocks signups or password changes.
 */

export function sha1Hex(value: string): string {
  return createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

export function hibpRangePrefix(sha1: string): string {
  return sha1.slice(0, 5).toUpperCase();
}

export function hibpRangeSuffix(sha1: string): string {
  return sha1.slice(5).toUpperCase();
}

/**
 * Parse a `range/<prefix>` response body (`SUFFIX:COUNT` lines) and return true when the password's
 * suffix is present with a non-zero count.
 */
export function parseHibpRangeResponse(body: string, suffix: string): boolean {
  const wanted = suffix.trim().toUpperCase();
  if (wanted.length === 0) return false;

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const [candidate, countRaw] = trimmed.split(':');
    if (!candidate || candidate.trim().toUpperCase() !== wanted) continue;
    const count = Number.parseInt(countRaw ?? '0', 10);
    return Number.isFinite(count) && count > 0;
  }
  return false;
}
