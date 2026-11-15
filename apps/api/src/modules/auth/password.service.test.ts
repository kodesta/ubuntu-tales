import { describe, expect, it } from 'vitest';
import { hash as argon2Hash } from '@node-rs/argon2';
import type { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { HibpService } from './hibp.service';
import {
  ARGON2_OPTIONS,
  PASSWORD_MIN_LENGTH,
  PasswordService,
  needsRehash,
  passwordPolicyErrors,
} from './password.service';

class StubHibp {
  constructor(private readonly compromised: boolean) {}
  get enabled(): boolean {
    return true;
  }
  isCompromised(): Promise<boolean> {
    return Promise.resolve(this.compromised);
  }
}

function serviceWith(compromised: boolean): PasswordService {
  return new PasswordService(new StubHibp(compromised) as unknown as HibpService);
}

async function expectWeakPassword(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
    throw new Error('expected AUTH_WEAK_PASSWORD');
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).code).toBe(ERROR_CODES.AUTH_WEAK_PASSWORD);
    expect((error as AppException).getStatus()).toBe(400);
  }
}

describe('passwordPolicyErrors', () => {
  it('requires at least 10 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(10);
    expect(passwordPolicyErrors('short')).toHaveLength(1);
    expect(passwordPolicyErrors('ninechars')).toHaveLength(1);
    expect(passwordPolicyErrors('ten-chars!')).toHaveLength(0);
  });

  it('caps absurdly long input', () => {
    expect(passwordPolicyErrors('a'.repeat(201))[0]?.field).toBe('password');
    expect(passwordPolicyErrors('a'.repeat(200))).toHaveLength(0);
  });
});

describe('PasswordService', () => {
  it('rejects a password below the policy minimum', async () => {
    await expectWeakPassword(serviceWith(false).assertAcceptable('tooshort'));
  });

  it('rejects a breached password (HIBP k-anonymity hit)', async () => {
    await expectWeakPassword(serviceWith(true).assertAcceptable('this-is-long-enough'));
  });

  it('accepts a long password that HIBP has not seen', async () => {
    await expect(serviceWith(false).assertAcceptable('correct-horse-ubuntu-42')).resolves.toBeUndefined();
  });

  it('hashes with argon2id and verifies round-trip', async () => {
    const service = serviceWith(false);
    const encoded = await service.hash('correct-horse-ubuntu-42');
    expect(encoded.startsWith('$argon2id$')).toBe(true);
    await expect(service.verify(encoded, 'correct-horse-ubuntu-42')).resolves.toBe(true);
    await expect(service.verify(encoded, 'wrong-password')).resolves.toBe(false);
    await expect(service.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });

  it('detects hashes that were produced with weaker parameters and need rehashing', async () => {
    const current = await argon2Hash('correct-horse-ubuntu-42', ARGON2_OPTIONS);
    expect(needsRehash(current)).toBe(false);

    const weaker = await argon2Hash('correct-horse-ubuntu-42', {
      ...ARGON2_OPTIONS,
      memoryCost: 4096,
      timeCost: 1,
    });
    expect(needsRehash(weaker)).toBe(true);
    expect(needsRehash('garbage')).toBe(true);
  });
});

describe('HibpService fail-open', () => {
  function configWith(overrides: Record<string, unknown>): ConfigService {
    return {
      get: (key: string) => overrides[key],
    } as unknown as ConfigService;
  }

  it('returns false without a network call when HIBP_ENABLED=false', async () => {
    class Forbidden extends HibpService {
      protected override async fetchRange(): Promise<string> {
        throw new Error('should not be called');
      }
    }
    const service = new Forbidden(configWith({ HIBP_ENABLED: false }));
    await expect(service.isCompromised('breached-password')).resolves.toBe(false);
  });

  it('fails open (allows the password) when the network request throws or times out', async () => {
    class TimingOut extends HibpService {
      protected override async fetchRange(): Promise<string> {
        throw new Error('The operation was aborted due to timeout');
      }
    }
    const service = new TimingOut(configWith({ HIBP_ENABLED: true, HIBP_TIMEOUT_MS: 10 }));
    await expect(service.isCompromised('some-password')).resolves.toBe(false);
  });

  it('detects a compromised password from a range response', async () => {
    // SHA-1("password") prefix 5BAA6; suffix 1E4C9B93F3F0682250B6CF8331B7EE68FD8.
    class Breached extends HibpService {
      protected override async fetchRange(prefix: string): Promise<string> {
        expect(prefix).toBe('5BAA6');
        return '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3303003\r\nPADDING:0';
      }
    }
    const service = new Breached(configWith({ HIBP_ENABLED: true }));
    await expect(service.isCompromised('password')).resolves.toBe(true);
  });
});
