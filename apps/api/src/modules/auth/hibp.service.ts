import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  hibpRangePrefix,
  hibpRangeSuffix,
  parseHibpRangeResponse,
  sha1Hex,
} from './hibp';

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range';

/** Internal sentinel used to distinguish a HIBP failure (fail open) from a breach hit. */
export class HibpUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HibpUnavailableError';
  }
}

/**
 * Checks a password against Have I Been Pwned using the k-anonymity range API.
 * Fail-open by design: timeouts, HTTP errors and network failures never reject a password.
 */
@Injectable()
export class HibpService {
  private readonly logger = new Logger(HibpService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return this.config.get<boolean>('HIBP_ENABLED') !== false;
  }

  async isCompromised(password: string): Promise<boolean> {
    if (!this.enabled || password.length === 0) return false;

    const sha1 = sha1Hex(password);
    try {
      const body = await this.fetchRange(hibpRangePrefix(sha1));
      return parseHibpRangeResponse(body, hibpRangeSuffix(sha1));
    } catch (error) {
      this.logger.warn(
        `HIBP check skipped (fail-open): ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /** Overridable seam for unit tests (no network). Throws on any non-2xx/timeout. */
  protected async fetchRange(prefix: string): Promise<string> {
    const timeoutMs = this.config.get<number>('HIBP_TIMEOUT_MS') ?? 2500;
    const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      method: 'GET',
      headers: {
        // Adds zero-count padding entries so responses cannot be size-correlated.
        'Add-Padding': 'true',
        'User-Agent': 'ubuntu-tales-api',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new HibpUnavailableError(`HIBP responded with ${response.status}`);
    return response.text();
  }
}
