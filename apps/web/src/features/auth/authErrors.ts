import { ApiError } from '@ubuntu-tales/api-client';

import type { FieldErrors } from './validation';

/** Where an error surfaced, so the copy can point at the right next action. */
export type AuthErrorContext =
  | 'login'
  | 'signup'
  | 'verify'
  | 'forgot'
  | 'reset'
  | 'password'
  | 'profile';

export interface ParsedAuthError {
  /** Sentence to show above the form (empty when the error is purely field-level). */
  message: string;
  /** Field-level messages, ready to merge into the form's error map. */
  fields: FieldErrors;
  code: string | null;
}

const GENERIC_COPY: Record<AuthErrorContext, string> = {
  login: "We couldn't sign you in just now. Try again in a moment.",
  signup: "We couldn't open your account just now. Try again in a moment.",
  verify: "We couldn't verify that link just now. Try again in a moment.",
  forgot: "We couldn't send that email just now. Try again in a moment.",
  reset: "We couldn't change your password just now. Try again in a moment.",
  password: "We couldn't change your password just now. Try again in a moment.",
  profile: "We couldn't save your details just now. Try again in a moment.",
};

const NETWORK_COPY = "We couldn't reach the fire. Check your connection and try again.";

function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'body' in error &&
      typeof (error as ApiError).body === 'object')
  );
}

/**
 * Turns an API failure into copy a reader can act on. Unknown codes fall back to a calm,
 * generic sentence; validation failures are mapped back onto form fields.
 */
export function interpretAuthError(
  error: unknown,
  context: AuthErrorContext,
): ParsedAuthError {
  if (!isApiError(error)) {
    return { message: NETWORK_COPY, fields: {}, code: null };
  }

  const code = error.body.code ?? null;
  const fields: FieldErrors = {};

  // RFC 9457 field errors arrive on VALIDATION_FAILED; use them when present.
  if (Array.isArray(error.body.errors)) {
    for (const item of error.body.errors) {
      if (item.field && item.message) fields[item.field] = item.message;
    }
  }

  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
      return {
        message:
          "That email and password don't match. Check them, or reset your password if you've forgotten it.",
        fields,
        code,
      };
    case 'AUTH_EMAIL_TAKEN':
      return {
        message: 'An account already uses that email. Try signing in instead.',
        fields: { ...fields, email: fields.email ?? 'An account already uses this email.' },
        code,
      };
    case 'AUTH_ACCOUNT_LOCKED':
      return {
        message: 'Too many attempts. Wait a few minutes, then try again.',
        fields,
        code,
      };
    case 'AUTH_EMAIL_NOT_VERIFIED':
      return {
        message: 'Your email is not verified yet. Check your inbox for our letter.',
        fields,
        code,
      };
    case 'AUTH_TOKEN_EXPIRED':
      return {
        message:
          context === 'reset'
            ? 'That reset link has expired. Ask for a new one below.'
            : 'That link has expired. Ask for a new one below.',
        fields,
        code,
      };
    case 'RATE_LIMITED':
      return {
        message: 'Too many attempts from here. Give it a minute, then try again.',
        fields,
        code,
      };
    case 'VALIDATION_FAILED':
      return {
        message:
          Object.keys(fields).length > 0
            ? ''
            : context === 'verify' || context === 'reset'
              ? 'That link looks incomplete or has expired. Ask for a new one below.'
              : 'Please check the highlighted fields.',
        fields,
        code,
      };
    case 'FORBIDDEN':
      return {
        message: 'You do not have permission to do that.',
        fields,
        code,
      };
    default: {
      const detail = error.body.detail?.trim();
      const looksSafe = detail && detail.length <= 160 && !/trace|sql|stack|bucket/i.test(detail);
      return {
        message: looksSafe ? detail : GENERIC_COPY[context],
        fields,
        code,
      };
    }
  }
}
