/** Failed-login lockout: 10 failures per 15 minutes (production plan 05 §3.2). */
export const LOCKOUT_THRESHOLD = 10;
export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

/** Verification-email resend: 3 per hour (production plan 03 §2.2). */
export const RESEND_LIMIT = 3;
export const RESEND_WINDOW_MS = 60 * 60 * 1000;

export interface LockoutState {
  locked: boolean;
  /** Seconds until the oldest failure in the window expires (0 when not locked). */
  retryAfterSeconds: number;
  failures: number;
}

/**
 * In-memory login failure tracker (no Valkey in this slice). One API process owns the counter, so a
 * horizontally scaled deployment would need the planned Valkey counters in Phase 5.
 */
export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly threshold: number = LOCKOUT_THRESHOLD,
    private readonly windowMs: number = LOCKOUT_WINDOW_MS,
  ) {}

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const timestamps = (this.failures.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (timestamps.length === 0) this.failures.delete(key);
    else this.failures.set(key, timestamps);
    return timestamps;
  }

  isLocked(key: string): LockoutState {
    const timestamps = this.recent(key);
    if (timestamps.length < this.threshold) {
      return { locked: false, retryAfterSeconds: 0, failures: timestamps.length };
    }
    const oldest = timestamps[0] ?? this.now();
    const retryAfterMs = Math.max(0, oldest + this.windowMs - this.now());
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      failures: timestamps.length,
    };
  }

  recordFailure(key: string): LockoutState {
    const timestamps = this.recent(key);
    timestamps.push(this.now());
    this.failures.set(key, timestamps);
    return this.isLocked(key);
  }

  reset(key: string): void {
    this.failures.delete(key);
  }
}

/**
 * A small fixed-window (actually sliding, timestamp list) limiter used for email resends. Kept
 * dependency-free and clock-injectable so the unit tests are deterministic.
 */
export class SlidingWindowLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const timestamps = (this.hits.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    if (timestamps.length === 0) this.hits.delete(key);
    else this.hits.set(key, timestamps);
    return timestamps;
  }

  /** Records a hit and returns true, or returns false when the limit has already been reached. */
  tryConsume(key: string): boolean {
    const timestamps = this.recent(key);
    if (timestamps.length >= this.limit) return false;
    timestamps.push(this.now());
    this.hits.set(key, timestamps);
    return true;
  }

  remaining(key: string): number {
    return Math.max(0, this.limit - this.recent(key).length);
  }

  retryAfterSeconds(key: string): number {
    const timestamps = this.recent(key);
    if (timestamps.length < this.limit) return 0;
    const oldest = timestamps[0] ?? this.now();
    return Math.ceil(Math.max(0, oldest + this.windowMs - this.now()) / 1000);
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}
