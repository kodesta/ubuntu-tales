import { createHash, randomBytes } from 'node:crypto';

/** Hex SHA-256. Email tokens and refresh tokens are stored hashed, never in plaintext. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Opaque, URL-safe token (default 32 random bytes = 256 bits of entropy, plan 05 §3.2). */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Expiry instant for a token created now. */
export function expiryFromNow(ttlMs: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + ttlMs);
}

export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
