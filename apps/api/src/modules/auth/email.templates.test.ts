import { describe, expect, it } from 'vitest';
import {
  redactSensitiveText,
  resetPasswordTemplate,
  verifyEmailTemplate,
} from './email.templates';

describe('transactional email templates', () => {
  it('builds the verification email with the link and 24-hour expiry copy', () => {
    const content = verifyEmailTemplate({
      displayName: 'Kwame',
      link: 'http://localhost:5173/verify-email?token=abc123',
    });
    expect(content.subject).toBe('Verify your email for Ubuntu Tales');
    expect(content.text).toContain('Kwame');
    expect(content.text).toContain('http://localhost:5173/verify-email?token=abc123');
    expect(content.text).toContain('24 hours');
    expect(content.text).toContain('UBUNTU TALES');
  });

  it('builds the password reset email with 30-minute expiry and single-use wording', () => {
    const content = resetPasswordTemplate({
      displayName: 'Amina',
      link: 'http://localhost:5173/reset-password?token=xyz',
    });
    expect(content.subject).toBe('Reset your Ubuntu Tales password');
    expect(content.text).toContain('30 minutes');
    expect(content.text).toContain('signs you out everywhere');
  });

  it('redacts one-time tokens from logs without touching the rest of the message', () => {
    const text = [
      'Verify: http://localhost:5173/verify-email?token=super-secret-value',
      'Reset: https://app.ubuntutales.com/reset-password?token=another-secret&next=/home',
      'refresh_token=abc.def.ghi',
    ].join('\n');
    const redacted = redactSensitiveText(text);

    expect(redacted).not.toContain('super-secret-value');
    expect(redacted).not.toContain('another-secret');
    expect(redacted).not.toContain('abc.def.ghi');
    expect(redacted).toContain('token=[redacted]');
    expect(redacted).toContain('verify-email');
    expect(redacted).toContain('https://app.ubuntutales.com/reset-password');
  });
});
