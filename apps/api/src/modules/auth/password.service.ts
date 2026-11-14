import { Injectable, Logger } from '@nestjs/common';
import type { Algorithm } from '@node-rs/argon2';
import { hash as argon2Hash, parseOptions, verify as argon2Verify } from '@node-rs/argon2';
import { ERROR_CODES, type ApiFieldError } from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { HibpService } from './hibp.service';

/** Policy from production plan 03 §2.2: at least 10 characters (HIBP adds the real strength bar). */
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 200;

/**
 * argon2id parameters from production plan 05 §3.2: memoryCost 19 MiB, timeCost 2, parallelism 1.
 * Hashes are re-computed on login when the stored parameters are weaker.
 */
/** `Algorithm.Argon2id` (an ambient const enum, which `isolatedModules` forbids using as a value). */
export const ARGON2_ALGORITHM_ID = 2 as Algorithm;

export const ARGON2_OPTIONS = {
  algorithm: ARGON2_ALGORITHM_ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

/** Returns user-facing policy violations (empty when the password passes the local policy). */
export function passwordPolicyErrors(password: string): ApiFieldError[] {
  const errors: ApiFieldError[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    });
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
    });
  }
  return errors;
}

/** True when a stored hash was produced with older/weaker parameters and should be upgraded. */
export function needsRehash(encodedHash: string): boolean {
  try {
    const parsed = parseOptions(encodedHash);
    return (
      (parsed.algorithm as number) !== (ARGON2_ALGORITHM_ID as number) ||
      parsed.memoryCost < ARGON2_OPTIONS.memoryCost ||
      parsed.timeCost < ARGON2_OPTIONS.timeCost
    );
  } catch {
    return true;
  }
}

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(private readonly hibp: HibpService) {}

  /** Validates policy + HIBP breach status, throwing `AUTH_WEAK_PASSWORD` (400) on failure. */
  async assertAcceptable(password: string, field = 'password'): Promise<void> {
    const errors = passwordPolicyErrors(password);
    if (errors.length > 0) {
      throw new AppException(
        ERROR_CODES.AUTH_WEAK_PASSWORD,
        400,
        errors[0]?.message ?? 'The password is too weak.',
        errors.map((error) => ({ ...error, field })),
      );
    }

    if (await this.hibp.isCompromised(password)) {
      throw new AppException(
        ERROR_CODES.AUTH_WEAK_PASSWORD,
        400,
        'This password has appeared in a known data breach. Please choose a different one.',
        [
          {
            field,
            message: 'This password has appeared in a known data breach. Please choose a different one.',
          },
        ],
      );
    }
  }

  async hash(password: string): Promise<string> {
    return argon2Hash(password, ARGON2_OPTIONS);
  }

  /** Constant-time-ish verification; malformed stored hashes simply fail. */
  async verify(encodedHash: string, password: string): Promise<boolean> {
    try {
      return await argon2Verify(encodedHash, password);
    } catch (error) {
      this.logger.warn(
        `Password verification failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
