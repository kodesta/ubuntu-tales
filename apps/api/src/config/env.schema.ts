import { z } from 'zod';

/**
 * Parse boolean-ish env values without the `z.coerce.boolean()` trap (where the string "false"
 * becomes `true`). Accepts true/false, 1/0, yes/no, on/off.
 */
const envBoolean = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) return defaultValue;
      if (typeof value === 'boolean') return value;
      const normalised = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalised)) return true;
      if (['0', 'false', 'no', 'off'].includes(normalised)) return false;
      throw new Error(`expected a boolean value (true/false), received "${value}"`);
    });

/** `15m`, `900s`, `2h` or `30d` — the formats jsonwebtoken/`ms` accepts. */
const ttlPattern = /^\d+[smhd]$/;

/**
 * The complete environment contract for the API, validated with Zod at boot (production plan 05
 * §3.1). A missing or malformed value fails startup with a readable list instead of a runtime 500.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    API_HOST: z.string().min(1).default('0.0.0.0'),
    API_PORT: z.coerce.number().int().positive().default(4100),
    /** Comma-separated list of browser origins allowed to call the API. */
    WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (PostgreSQL connection string).'),

    /** Timezone used to decide "today" for the story of the day and reading streaks. */
    EDITORIAL_TZ: z.string().min(1).default('Africa/Johannesburg'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).default('log'),

    // ───────────── Phase 2: auth sessions ─────────────
    JWT_SECRET: z
      .string()
      .min(32, 'JWT_SECRET must be at least 32 characters. Generate 64 random bytes for real use.'),
    JWT_ACCESS_TTL: z.string().regex(ttlPattern, 'JWT_ACCESS_TTL must look like 15m.').default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(365).default(30),
    /** Set true behind HTTPS; false for local http://localhost development. */
    COOKIE_SECURE: envBoolean(false),
    HIBP_ENABLED: envBoolean(true),
    /** HIBP k-anonymity request timeout; the check fails open on timeout/error. */
    HIBP_TIMEOUT_MS: z.coerce.number().int().positive().max(10000).default(2500),

    // ───────────── Phase 2: email (Mailpit locally) ─────────────
    SMTP_HOST: z.string().min(1).default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().max(65535).default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().min(1).default('Ubuntu Tales <hello@ubuntutales.local>'),
    /** When true (or when SMTP fails) emails are logged to the API console instead of sent. */
    EMAIL_LOG_ONLY: envBoolean(false),

    /** Used by `pnpm db:seed` to create the dev users; never set in production. */
    SEED_DEV_PASSWORD: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    // Fail fast on a weak signing secret in production (plan 08 §5).
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 48) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 48 characters in production.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** `ConfigModule` validate hook: returns the parsed env or throws a readable error. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
