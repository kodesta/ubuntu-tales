export interface EmailContent {
  subject: string;
  text: string;
}

export const VERIFY_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_PASSWORD_TTL_MS = 30 * 60 * 1000;

const SIGNATURE = '— The Ubuntu Tales team\n\nA person is a person through other persons.';

export function verifyEmailTemplate(input: {
  displayName: string;
  link: string;
}): EmailContent {
  return {
    subject: 'Verify your email for Ubuntu Tales',
    text: [
      'UBUNTU TALES',
      '',
      `Molo ${input.displayName},`,
      '',
      'You are one step away from keeping your saved tales, reading progress and roots on your account.',
      '',
      'Verify your email address:',
      input.link,
      '',
      'This link can be used once and expires in 24 hours.',
      'If you did not create an Ubuntu Tales account, you can ignore this email — nothing changes without the link.',
      '',
      SIGNATURE,
    ].join('\n'),
  };
}

export function resetPasswordTemplate(input: {
  displayName: string;
  link: string;
}): EmailContent {
  return {
    subject: 'Reset your Ubuntu Tales password',
    text: [
      'UBUNTU TALES',
      '',
      `Molo ${input.displayName},`,
      '',
      'Someone asked to reset the password for your Ubuntu Tales account. If that was you, open the link below to choose a new password:',
      '',
      input.link,
      '',
      'This link can be used once and expires in 30 minutes. Choosing a new password signs you out everywhere.',
      'If you did not ask for a reset, you can ignore this email — your current password still works.',
      '',
      SIGNATURE,
    ].join('\n'),
  };
}

/**
 * Removes one-time tokens from text before it is written to logs. Dev/staging logs must never leak
 * credentials into shared log storage (plan 08 §2: redact tokens, passwords and cookies).
 */
export function redactSensitiveText(text: string): string {
  // Covers `?token=`, `&token=`, `refresh_token=` (cookie-style) and `token=` at line start.
  return text.replace(/(^|[?&\s])((?:refresh_token|token)=)[^&\s]+/gi, '$1$2[redacted]');
}
