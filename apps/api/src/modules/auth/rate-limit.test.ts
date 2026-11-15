import { describe, expect, it } from 'vitest';
import {
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MS,
  LoginThrottle,
  RESEND_LIMIT,
  RESEND_WINDOW_MS,
  SlidingWindowLimiter,
} from './rate-limit';

describe('LoginThrottle', () => {
  function setup() {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const throttle = new LoginThrottle(() => now);
    return {
      throttle,
      advance(ms: number) {
        now += ms;
      },
    };
  }

  it('locks out after 10 failures within 15 minutes and reports retry-after', () => {
    const { throttle } = setup();
    for (let attempt = 1; attempt < LOCKOUT_THRESHOLD; attempt += 1) {
      expect(throttle.recordFailure('kwame@ubuntutales.local').locked).toBe(false);
    }
    const state = throttle.recordFailure('kwame@ubuntutales.local');
    expect(state.locked).toBe(true);
    expect(state.retryAfterSeconds).toBeGreaterThan(0);
    expect(state.retryAfterSeconds).toBeLessThanOrEqual(LOCKOUT_WINDOW_MS / 1000);
  });

  it('unlocks automatically once the window slides past the oldest failure', () => {
    const { throttle, advance } = setup();
    for (let attempt = 0; attempt < LOCKOUT_THRESHOLD; attempt += 1) {
      throttle.recordFailure('user@example.com');
    }
    expect(throttle.isLocked('user@example.com').locked).toBe(true);
    advance(LOCKOUT_WINDOW_MS + 1);
    expect(throttle.isLocked('user@example.com').locked).toBe(false);
  });

  it('resets on a successful sign-in and never leaks lockout across accounts', () => {
    const { throttle } = setup();
    for (let attempt = 0; attempt < LOCKOUT_THRESHOLD; attempt += 1) {
      throttle.recordFailure('a@example.com');
    }
    expect(throttle.isLocked('a@example.com').locked).toBe(true);
    expect(throttle.isLocked('b@example.com').locked).toBe(false);
    throttle.reset('a@example.com');
    expect(throttle.isLocked('a@example.com').locked).toBe(false);
  });
});

describe('SlidingWindowLimiter', () => {
  function setup() {
    let now = Date.parse('2026-01-01T00:00:00.000Z');
    const limiter = new SlidingWindowLimiter(RESEND_LIMIT, RESEND_WINDOW_MS, () => now);
    return { limiter, advance: (ms: number) => (now += ms) };
  }

  it('allows exactly 3 resends per hour', () => {
    const { limiter } = setup();
    expect(limiter.tryConsume('user-1')).toBe(true);
    expect(limiter.tryConsume('user-1')).toBe(true);
    expect(limiter.tryConsume('user-1')).toBe(true);
    expect(limiter.tryConsume('user-1')).toBe(false);
    expect(limiter.remaining('user-1')).toBe(0);
    expect(limiter.retryAfterSeconds('user-1')).toBeGreaterThan(0);
  });

  it('opens the window again after an hour', () => {
    const { limiter, advance } = setup();
    for (let attempt = 0; attempt < RESEND_LIMIT; attempt += 1) limiter.tryConsume('user-1');
    expect(limiter.tryConsume('user-1')).toBe(false);
    advance(RESEND_WINDOW_MS + 1);
    expect(limiter.tryConsume('user-1')).toBe(true);
  });

  it('tracks keys independently', () => {
    const { limiter } = setup();
    for (let attempt = 0; attempt < RESEND_LIMIT; attempt += 1) limiter.tryConsume('a');
    expect(limiter.tryConsume('a')).toBe(false);
    expect(limiter.tryConsume('b')).toBe(true);
  });
});
