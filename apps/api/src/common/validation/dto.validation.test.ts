import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { flattenValidationErrors } from './validation.pipe';
import { LoginDto, RegisterDto, ResetPasswordDto, UpdateMeDto } from '../../modules/users/users.dto';
import { ProgressInputDto, ReactionInputDto } from '../../modules/activity/activity.dto';

async function validateDto<T extends object>(cls: new () => T, plain: unknown): Promise<string[]> {
  const instance = plainToInstance(cls, plain);
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return flattenValidationErrors(errors).map((error) => `${error.field}: ${error.message}`);
}

const VALID_REGISTER = {
  displayName: 'Kwame Mensah',
  email: 'Kwame@UbuntuTales.local',
  password: 'ten-chars-ok',
  acceptTerms: true,
  acceptPrivacy: true,
  confirmAge13Plus: true,
};

describe('RegisterDto', () => {
  it('accepts a valid registration and lower-cases the email', async () => {
    const instance = plainToInstance(RegisterDto, VALID_REGISTER);
    await expect(validate(instance)).resolves.toHaveLength(0);
    expect(instance.email).toBe('kwame@ubuntutales.local');
  });

  it('requires all three consent confirmations', async () => {
    const errors = await validateDto(RegisterDto, {
      ...VALID_REGISTER,
      acceptTerms: false,
      acceptPrivacy: undefined,
    });
    expect(errors.some((message) => message.startsWith('acceptTerms'))).toBe(true);
    expect(errors.some((message) => message.startsWith('acceptPrivacy'))).toBe(true);
  });

  it('rejects short passwords, invalid emails and unknown properties', async () => {
    const errors = await validateDto(RegisterDto, {
      ...VALID_REGISTER,
      email: 'not-an-email',
      password: 'short',
      isAdmin: true,
    });
    expect(errors.some((message) => message.startsWith('email'))).toBe(true);
    expect(errors.some((message) => message.startsWith('password'))).toBe(true);
    expect(errors.some((message) => message.startsWith('isAdmin'))).toBe(true);
  });

  it('rejects an invalid community role', async () => {
    const errors = await validateDto(RegisterDto, { ...VALID_REGISTER, communityRole: 'WIZARD' });
    expect(errors.some((message) => message.startsWith('communityRole'))).toBe(true);
  });
});

describe('LoginDto / ResetPasswordDto', () => {
  it('requires a valid email and a password', async () => {
    expect(await validateDto(LoginDto, { email: 'x', password: '' })).not.toHaveLength(0);
    expect(await validateDto(LoginDto, { email: 'kwame@ubuntutales.local', password: 'x' })).toHaveLength(0);
  });

  it('enforces the 10-character minimum on reset passwords', async () => {
    const errors = await validateDto(ResetPasswordDto, { token: 'a'.repeat(20), newPassword: 'short' });
    expect(errors.some((message) => message.startsWith('newPassword'))).toBe(true);
  });
});

describe('UpdateMeDto', () => {
  it('accepts partial patches including explicit nulls to clear roots', async () => {
    await expect(
      validateDto(UpdateMeDto, { displayName: 'Kwame M.', tribeId: null, customLineage: null }),
    ).resolves.toHaveLength(0);
    await expect(validateDto(UpdateMeDto, { communityRole: 'SEEKER', locale: 'en-ZA' })).resolves.toHaveLength(0);
  });

  it('rejects bad locales and blank display names', async () => {
    const errors = await validateDto(UpdateMeDto, { locale: 'ENGLISH', displayName: ' ' });
    expect(errors.some((message) => message.startsWith('locale'))).toBe(true);
    expect(errors.some((message) => message.startsWith('displayName'))).toBe(true);
  });
});

describe('ProgressInputDto', () => {
  const valid = {
    narrationId: '0190a0b0-0000-7000-8000-0000000000aa',
    lastSentenceId: 's_0012',
    audioPositionMs: 1500,
    percent: 42,
    listenedDeltaSec: 12,
    clientUpdatedAt: '2026-01-01T10:00:00.000Z',
  };

  it('accepts a valid progress payload', async () => {
    await expect(validateDto(ProgressInputDto, valid)).resolves.toHaveLength(0);
  });

  it('rejects out-of-range percent, negative deltas and bad timestamps', async () => {
    const errors = await validateDto(ProgressInputDto, {
      ...valid,
      percent: 150,
      listenedDeltaSec: -1,
      clientUpdatedAt: 'yesterday',
    });
    expect(errors.some((message) => message.startsWith('percent'))).toBe(true);
    expect(errors.some((message) => message.startsWith('listenedDeltaSec'))).toBe(true);
    expect(errors.some((message) => message.startsWith('clientUpdatedAt'))).toBe(true);
  });
});

describe('ReactionInputDto', () => {
  it('accepts only the five documented reaction types', async () => {
    await expect(validateDto(ReactionInputDto, { type: 'JOY' })).resolves.toHaveLength(0);
    expect(await validateDto(ReactionInputDto, { type: 'LOVE' })).not.toHaveLength(0);
  });
});
