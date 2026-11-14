import { describe, expect, it } from 'vitest';

import {
  firstNameOf,
  normaliseEmail,
  sanitizeRedirect,
  validateChangePassword,
  validateDisplayName,
  validateEmail,
  validateLogin,
  validatePassword,
  validateSignup,
  type SignupValues,
} from './validation';

const validSignup: SignupValues = {
  displayName: 'Thandiwe Nkosi',
  email: 'thandiwe@ubuntutales.local',
  password: 'ubuntu-tales-dev',
  shareRoots: false,
  acceptTerms: true,
  acceptPrivacy: true,
  confirmAge13Plus: true,
};

describe('email validation', () => {
  it('accepts a normal address and normalises case/whitespace', () => {
    expect(validateEmail('  Reader@Example.COM ')).toBeUndefined();
    expect(normaliseEmail('  Reader@Example.COM ')).toBe('reader@example.com');
  });

  it('asks for an address when empty', () => {
    expect(validateEmail('')).toMatch(/enter your email/i);
  });

  it('rejects incomplete addresses', () => {
    expect(validateEmail('reader@')).toMatch(/does not look complete/i);
    expect(validateEmail('reader@example')).toMatch(/does not look complete/i);
    expect(validateEmail('reader example.com')).toMatch(/does not look complete/i);
  });
});

describe('password validation', () => {
  it('enforces the API minimum of ten characters', () => {
    expect(validatePassword('')).toMatch(/choose a password/i);
    expect(validatePassword('short')).toMatch(/at least 10 characters/i);
    expect(validatePassword('ten-chars!')).toBeUndefined();
  });
});

describe('display name validation', () => {
  it('requires a real name and caps the length', () => {
    expect(validateDisplayName('  ')).toMatch(/tell us the name/i);
    expect(validateDisplayName('A')).toMatch(/too short/i);
    expect(validateDisplayName('x'.repeat(81))).toMatch(/under 80/i);
    expect(validateDisplayName('  Amina Diallo ')).toBeUndefined();
  });
});

describe('login validation', () => {
  it('requires both fields', () => {
    const errors = validateLogin({ email: '', password: '' });
    expect(errors.email).toBeTruthy();
    expect(errors.password).toMatch(/enter your password/i);
  });

  it('passes for well-formed credentials', () => {
    expect(validateLogin({ email: 'a@b.co', password: 'anything' })).toEqual({});
  });
});

describe('signup validation', () => {
  it('accepts a minimal, consented account', () => {
    expect(validateSignup(validSignup)).toEqual({});
  });

  it('requires age, terms and privacy confirmations', () => {
    const errors = validateSignup({
      ...validSignup,
      acceptTerms: false,
      acceptPrivacy: false,
      confirmAge13Plus: false,
    });
    expect(errors.acceptTerms).toMatch(/terms/i);
    expect(errors.acceptPrivacy).toMatch(/privacy/i);
    expect(errors.confirmAge13Plus).toMatch(/13 or older/i);
  });

  it('requires consent before roots are shared', () => {
    const errors = validateSignup({
      ...validSignup,
      shareRoots: false,
      tribeId: 'tribe-zulu',
    });
    expect(errors.lineageConsent).toMatch(/happy to share your roots/i);
  });

  it('accepts roots once consent is given', () => {
    expect(
      validateSignup({ ...validSignup, shareRoots: true, customLineage: 'Yoruba, Ibadan' }),
    ).toEqual({});
  });

  it('does not require consent when roots are left blank', () => {
    expect(validateSignup({ ...validSignup, shareRoots: true })).toEqual({});
  });
});

describe('change password validation', () => {
  it('checks current, new and confirmation', () => {
    const errors = validateChangePassword({
      currentPassword: '',
      newPassword: 'short',
      confirmPassword: 'different',
    });
    expect(errors.currentPassword).toBeTruthy();
    expect(errors.newPassword).toMatch(/at least 10/i);
    expect(errors.confirmPassword).toMatch(/do not match/i);
  });

  it('passes when the new password is confirmed', () => {
    expect(
      validateChangePassword({
        currentPassword: 'old-password',
        newPassword: 'new-password',
        confirmPassword: 'new-password',
      }),
    ).toEqual({});
  });
});

describe('redirect sanitising', () => {
  it('keeps in-app paths with query strings', () => {
    expect(sanitizeRedirect('/saved?filter=in-progress')).toBe('/saved?filter=in-progress');
    expect(sanitizeRedirect('/stories/the-hare')).toBe('/stories/the-hare');
  });

  it('drops external, scheme-relative and malformed values', () => {
    expect(sanitizeRedirect('https://evil.example')).toBeNull();
    expect(sanitizeRedirect('//evil.example')).toBeNull();
    expect(sanitizeRedirect('/\\evil')).toBeNull();
    expect(sanitizeRedirect('javascript:alert(1)')).toBeNull();
    expect(sanitizeRedirect('')).toBeNull();
    expect(sanitizeRedirect(undefined)).toBeNull();
  });
});

describe('firstNameOf', () => {
  it('takes the first word and falls back gracefully', () => {
    expect(firstNameOf('Thandiwe Nkosi')).toBe('Thandiwe');
    expect(firstNameOf('   ')).toBe('reader');
  });
});
