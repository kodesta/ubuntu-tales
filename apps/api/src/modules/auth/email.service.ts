import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import {
  redactSensitiveText,
  resetPasswordTemplate,
  verifyEmailTemplate,
  type EmailContent,
} from './email.templates';

export interface EmailRecipient {
  email: string;
  displayName: string;
}

/**
 * Sends transactional email through SMTP (Mailpit in development, plan 05 §3.8).
 *
 * Email is best-effort: a Mailpit/SMTP outage must never fail registration or password reset. When
 * `EMAIL_LOG_ONLY=true` (or after a send failure) the message is logged instead; in production the
 * log line has one-time tokens redacted.
 */
@Injectable()
export class EmailService implements OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleDestroy(): Promise<void> {
    this.transporter?.close();
    this.transporter = null;
  }

  async sendVerificationEmail(to: EmailRecipient, token: string): Promise<void> {
    const content = verifyEmailTemplate({
      displayName: to.displayName,
      link: this.webLink('/verify-email', token),
    });
    await this.send(to.email, content);
  }

  async sendPasswordResetEmail(to: EmailRecipient, token: string): Promise<void> {
    const content = resetPasswordTemplate({
      displayName: to.displayName,
      link: this.webLink('/reset-password', token),
    });
    await this.send(to.email, content);
  }

  private webLink(path: string, token: string): string {
    const origin = (this.config.get<string>('WEB_ORIGIN') ?? 'http://localhost:5173')
      .split(',')[0]
      ?.trim();
    return `${origin ?? 'http://localhost:5173'}${path}?token=${encodeURIComponent(token)}`;
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  private logOnly(): boolean {
    return this.config.get<boolean>('EMAIL_LOG_ONLY') === true;
  }

  private getTransporter(): Transporter {
    if (this.transporter) return this.transporter;
    const user = this.config.get<string>('SMTP_USER');
    const password = this.config.get<string>('SMTP_PASSWORD');
    this.transporter = createTransport({
      host: this.config.get<string>('SMTP_HOST') ?? 'localhost',
      port: this.config.get<number>('SMTP_PORT') ?? 1025,
      secure: false,
      ...(user ? { auth: { user, pass: password ?? '' } } : {}),
      // Keep boot and requests fast when Mailpit is not running; failures fall back to logging.
      connectionTimeout: 2500,
      greetingTimeout: 2500,
      socketTimeout: 5000,
    });
    return this.transporter;
  }

  private async send(to: string, content: EmailContent): Promise<void> {
    if (this.logOnly()) {
      this.logFallback(to, content, 'EMAIL_LOG_ONLY is enabled');
      return;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.config.get<string>('SMTP_FROM') ?? 'Ubuntu Tales <hello@ubuntutales.local>',
        to,
        subject: content.subject,
        text: content.text,
      });
      this.logger.log(`Sent "${content.subject}" to ${this.maskEmail(to)}`);
    } catch (error) {
      this.transporter = null;
      this.logFallback(
        to,
        content,
        `SMTP send failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Console fallback: full text in dev, tokens redacted in production. Never throws. */
  private logFallback(to: string, content: EmailContent, reason: string): void {
    const text = this.isProduction() ? redactSensitiveText(content.text) : content.text;
    this.logger.log(
      `[email fallback] ${reason}; to=${this.maskEmail(to)} subject="${content.subject}"\n${text}`,
    );
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '[invalid-email]';
    return `${local.slice(0, 2)}***@${domain}`;
  }
}
