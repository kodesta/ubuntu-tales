import { z } from 'zod';

/**
 * The complete environment contract for the API, validated with Zod at boot (production plan 05
 * §3.1). A missing or malformed value fails startup with a readable list instead of a runtime 500.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4100),
  /** Comma-separated list of browser origins allowed to call the API. */
  WEB_ORIGIN: z.string().min(1).default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (PostgreSQL connection string).'),

  /** Timezone used to decide "today" for the story of the day. */
  EDITORIAL_TZ: z.string().min(1).default('Africa/Johannesburg'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'log', 'debug', 'verbose']).default('log'),
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
