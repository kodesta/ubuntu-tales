import { describe, expect, it } from 'vitest';
import { DAY_MS, expiryFromNow, generateOpaqueToken, sha256Hex } from './token.util';

describe('sha256Hex', () => {
  it('hashes known values', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex('ubuntu')).toBe(
      '7804a56a5c7636cc05814736f44139e32920810d3bd51aa099a5df932e754ce9',
    );
  });

  it('is deterministic and hex-encoded', () => {
    const hash = sha256Hex('refresh-token-value');
    expect(hash).toBe(sha256Hex('refresh-token-value'));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(sha256Hex('refresh-token-value!'));
  });
});

describe('generateOpaqueToken', () => {
  it('generates URL-safe tokens with 256 bits of entropy by default', () => {
    const token = generateOpaqueToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // 32 bytes base64url ≈ 43 characters.
    expect(token.length).toBeGreaterThanOrEqual(42);
    expect(token.length).toBeLessThanOrEqual(44);
  });

  it('never repeats tokens', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('expiryFromNow', () => {
  it('adds the TTL to the provided clock', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(expiryFromNow(DAY_MS, now).toISOString()).toBe('2026-01-02T00:00:00.000Z');
    expect(expiryFromNow(30 * DAY_MS, now).toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
