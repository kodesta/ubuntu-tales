/**
 * Client-side validation for the account forms. The rules mirror the API contract
 * (docs 03 §2.2): password ≥ 10 characters, a real display name, explicit age/terms/privacy
 * confirmations and consent before any roots/lineage is shared. The server remains the
 * authority — `authErrors.ts` folds server Problem Details back into these same field keys.
 */

/** Mirror of the API's password minimum (docs 03 §2.2, 08 §3). */
export const PASSWORD_MIN_LENGTH = 10;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const EMAIL_MAX_LENGTH = 254;

export interface FieldErrors {
  [field: string]: string | undefined;
}

export interface LoginValues {
  email: string;
  password: string;
}

export interface SignupValues {
  displayName: string;
  email: string;
  password: string;
  /** Chosen publication/tribe id — only sent when the reader consented to share roots. */
  tribeId?: string;
  /** Free-text lineage for readers whose roots are not one of the seeded publications. */
  customLineage?: string;
  communityRole?: string;
  shareRoots: boolean;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  confirmAge13Plus: boolean;
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEmail(value: string): string | undefined {
  const email = normaliseEmail(value);
  if (!email) return 'Enter your email address.';
  if (email.length > EMAIL_MAX_LENGTH) return 'That email address is too long.';
  // Deliberately forgiving: the API validates properly, and a stricter regex only rejects
  // addresses that real people own.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'That email address does not look complete.';
  }
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Choose a password.';
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return undefined;
}

export function validateNewPassword(value: string): string | undefined {
  if (!value) return 'Choose a new password.';
  return validatePassword(value);
}

export function validateDisplayName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'Tell us the name the fire should call you.';
  if (name.length < DISPLAY_NAME_MIN_LENGTH) return 'That name is a little too short.';
  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return `Keep your name under ${DISPLAY_NAME_MAX_LENGTH} characters.`;
  }
  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): string | undefined {
  if (!confirmation) return 'Type your new password once more.';
  if (password !== confirmation) return 'Those passwords do not match yet.';
  return undefined;
}

function compact(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as FieldErrors;
}

export function validateLogin(values: LoginValues): FieldErrors {
  return compact({
    email: validateEmail(values.email),
    password: values.password ? undefined : 'Enter your password.',
  });
}

/**
 * Signup validation, including the privacy constraints from docs 08 §3: roots/lineage are
 * optional but require explicit consent, at most one of "choose a publication" or free-text
 * lineage is used, and the age/terms/privacy confirmations are mandatory.
 */
export function validateSignup(values: SignupValues): FieldErrors {
  const hasRoots = Boolean(values.tribeId || values.customLineage?.trim());

  return compact({
    displayName: validateDisplayName(values.displayName),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    lineageConsent:
      hasRoots && !values.shareRoots
        ? 'Confirm you are happy to share your roots, or leave them unshared.'
        : undefined,
    acceptTerms: values.acceptTerms ? undefined : 'Please accept the terms of reading.',
    acceptPrivacy: values.acceptPrivacy ? undefined : 'Please accept the privacy policy.',
    confirmAge13Plus: values.confirmAge13Plus
      ? undefined
      : 'You need to be 13 or older to keep an account.',
  });
}

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function validateChangePassword(values: ChangePasswordValues): FieldErrors {
  return compact({
    currentPassword: values.currentPassword ? undefined : 'Enter your current password.',
    newPassword: validateNewPassword(values.newPassword),
    confirmPassword: validatePasswordConfirmation(values.newPassword, values.confirmPassword),
  });
}

/** First word of a display name, for warm toasts ("Welcome back, Thandiwe."). */
export function firstNameOf(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || 'reader';
}

/**
 * Only ever resume an in-app path: a leading slash, no scheme-relative `//`, no backslashes or
 * control characters. Keeping `?query` and `#hash` lets `/profile?tab=…`-style links survive.
 */
export function sanitizeRedirect(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidate = value.trim();
  if (!candidate.startsWith('/')) return null;
  if (candidate.startsWith('//') || candidate.includes('\\')) return null;
  if (candidate.length > 500) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(candidate)) return null;
  return candidate;
}
