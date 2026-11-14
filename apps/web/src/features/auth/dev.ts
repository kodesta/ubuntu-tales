/**
 * Development-only conveniences: the seeded local accounts and the email/reset tokens the API
 * returns outside production (docs 03 §2.2). Everything here is guarded by `import.meta.env.DEV`
 * — production bundles contain the code but never the data or the tokens.
 */

export interface DevSeedUser {
  label: string;
  email: string;
  password: string;
}

/** Must match `SEED_DEV_PASSWORD` in the API's .env (docs DEVIATIONS, Phase 2 seed users). */
export const DEV_SEED_PASSWORD = 'ubuntu-tales-dev';

export const DEV_SEED_USERS: DevSeedUser[] = import.meta.env.DEV
  ? [
      { label: 'Kwame', email: 'kwame@ubuntutales.local', password: DEV_SEED_PASSWORD },
      { label: 'Thandiwe', email: 'thandiwe@ubuntutales.local', password: DEV_SEED_PASSWORD },
      { label: 'Tendai', email: 'tendai@ubuntutales.local', password: DEV_SEED_PASSWORD },
      { label: 'Amina', email: 'amina@ubuntutales.local', password: DEV_SEED_PASSWORD },
    ]
  : [];

export function isDevEnvironment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Keeps the last non-production verification token in memory (never localStorage) so the
 * `/verify-email` page can offer a one-click DEV check after signup. A page reload clears it.
 */
let devEmailToken: string | null = null;

export function rememberDevEmailToken(token: string | undefined | null): void {
  if (!import.meta.env.DEV || !token) return;
  devEmailToken = token;
}

export function peekDevEmailToken(): string | null {
  return import.meta.env.DEV ? devEmailToken : null;
}

export function clearDevEmailToken(): void {
  devEmailToken = null;
}
