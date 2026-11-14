import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Phase 2 account helpers.
 *
 * The auth screens are tested through the real UI where possible. These helpers mint disposable
 * accounts through the API so state-heavy journeys (saved/progress/reactions, profile/settings)
 * start from a clean, deterministic account without mutating the seeded dev users. The refresh
 * cookie is an httpOnly cookie, so signing in a browser context means replaying it as a cookie
 * (`signInBrowserContext`) rather than injecting a token into localStorage — which is exactly the
 * production session shape this suite must protect.
 */

export const API_URL = process.env.API_URL ?? 'http://localhost:4100/api/v1';
export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
export const DEV_PASSWORD = 'ubuntu-tales-dev';

export interface Account {
  displayName: string;
  email: string;
  password: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  emailVerified: boolean;
  devEmailToken?: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  setCookies: string[];
}

/** Unique per test run; the dev database intentionally accumulates QA accounts. */
export function uniqueEmail(prefix = 'qa2'): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now()}-${random}@ubuntutales.local`;
}

/** Parses `refresh_token=…` out of a response's Set-Cookie headers. */
function readRefreshToken(setCookies: string[]): string {
  for (const cookie of setCookies) {
    const match = /(?:^|;\s*)refresh_token=([^;]+)/.exec(cookie);
    if (match) return decodeURIComponent(match[1] as string);
  }
  throw new Error('The API did not set a refresh_token cookie.');
}

function readSetCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

export async function apiRequest<T = Record<string, unknown>>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    token?: string | null;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let body: T;
  const text = await response.text();
  try {
    body = (text ? JSON.parse(text) : undefined) as T;
  } catch {
    body = text as unknown as T;
  }

  return { status: response.status, body, setCookies: readSetCookies(response) };
}

export interface RegisterOptions {
  displayName?: string;
  email?: string;
  password?: string;
  /** Verify the email through the dev token (register response) before returning. */
  verify?: boolean;
  tribeId?: string;
  communityRole?: string;
  customLineage?: string;
}

/** Creates a disposable account through `POST /auth/register`. */
export async function registerAccount(options: RegisterOptions = {}): Promise<Account> {
  const displayName = options.displayName ?? 'QA Reader';
  const email = options.email ?? uniqueEmail();
  const password = options.password ?? DEV_PASSWORD;

  const response = await apiRequest<{
    accessToken: string;
    user: { id: string; emailVerified: boolean };
    devEmailToken?: string;
  }>('/auth/register', {
    method: 'POST',
    body: {
      displayName,
      email,
      password,
      acceptTerms: true,
      acceptPrivacy: true,
      confirmAge13Plus: true,
      ...(options.tribeId ? { tribeId: options.tribeId, consentLineagePersonalisation: true } : {}),
      ...(options.customLineage ? { customLineage: options.customLineage } : {}),
      ...(options.communityRole ? { communityRole: options.communityRole } : {}),
    },
  });

  expect(response.status, `register ${email}: ${JSON.stringify(response.body)}`).toBe(201);
  const registerBody = response.body as {
    accessToken: string;
    user: { id: string };
    devEmailToken?: string;
  };

  const account: Account = {
    displayName,
    email,
    password,
    userId: registerBody.user.id,
    accessToken: registerBody.accessToken,
    refreshToken: readRefreshToken(response.setCookies),
    emailVerified: false,
    devEmailToken: registerBody.devEmailToken,
  };

  if (options.verify) {
    if (!account.devEmailToken) throw new Error('Register did not return a devEmailToken.');
    const verify = await apiRequest('/auth/verify-email', {
      method: 'POST',
      body: { token: account.devEmailToken },
    });
    expect(verify.status, `verify ${email}: ${JSON.stringify(verify.body)}`).toBe(200);
    account.emailVerified = true;
  }

  return account;
}

/** Opens a brand-new login session for an existing account (separate refresh family). */
export async function loginViaApi(
  email: string,
  password: string = DEV_PASSWORD,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const response = await apiRequest<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  expect(response.status, `login ${email}: ${JSON.stringify(response.body)}`).toBe(200);
  return {
    accessToken: response.body.accessToken,
    refreshToken: readRefreshToken(response.setCookies),
    userId: response.body.user.id,
  };
}

/** Replays an httpOnly refresh cookie into a browser context (session restore on next boot). */
export async function signInBrowserContext(
  context: BrowserContext,
  refreshToken: string,
): Promise<void> {
  const hostname = new URL(WEB_URL).hostname;
  await context.addCookies([
    {
      name: 'refresh_token',
      value: refreshToken,
      domain: hostname,
      path: '/api/v1/auth',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false,
    },
  ]);
}

/**
 * Arms a waiter for the boot `/auth/refresh` round trip. Minimal-chrome routes (the reader and the
 * celebration screen) hide the header, so this is the reliable "session restored" signal there.
 */
export async function awaitBootRefresh(page: Page): Promise<() => Promise<void>> {
  const waiter = page
    .waitForResponse((response) => response.url().includes('/api/v1/auth/refresh'), {
      timeout: 20_000,
    })
    .catch(() => null);
  return async () => {
    await waiter;
    await page.waitForTimeout(300);
  };
}

/** Waits until the header shows the signed-in account menu (session boot finished). */
export async function waitForSignedIn(page: Page): Promise<void> {
  await expect(
    page
      .locator('header')
      .first()
      .getByRole('button', { name: /account menu/i }),
  ).toBeVisible({ timeout: 20_000 });
}

export async function waitForGuest(page: Page): Promise<void> {
  await expect(
    page.locator('header').first().getByRole('link', { name: 'Sign in', exact: true }),
  ).toBeVisible({ timeout: 20_000 });
}

/** Signs the page's context in with `account` and opens `path`, waiting for the signed-in shell. */
export async function openSignedIn(
  page: Page,
  path: string,
  account: Pick<Account, 'refreshToken'>,
): Promise<void> {
  await signInBrowserContext(page.context(), account.refreshToken);
  const waitForBoot = await awaitBootRefresh(page);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main h1').first()).toBeVisible();
  await waitForBoot();
  if (!path.startsWith('/stories/')) await waitForSignedIn(page);
}

/** Reloads the current page while the refresh cookie restores the session. */
export async function reloadSignedIn(page: Page): Promise<void> {
  const waitForBoot = await awaitBootRefresh(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForBoot();
  if (!page.url().includes('/stories/')) await waitForSignedIn(page);
}

export async function openAccountMenu(page: Page): Promise<void> {
  await page
    .locator('header')
    .first()
    .getByRole('button', { name: /account menu/i })
    .click();
  await expect(page.locator('#account-menu-panel')).toBeVisible();
}

export async function signOutViaMenu(page: Page): Promise<void> {
  await openAccountMenu(page);
  await page.locator('#account-menu-panel').getByRole('button', { name: 'Sign out' }).click();
  await waitForGuest(page);
}

/* ----------------------------------------------------------------- accounts API reads -------- */

export interface ProgressItem {
  story: { id: string; slug: string };
  progress: {
    percent: number;
    completed: boolean;
    completedAt?: string;
    lastSentenceId?: string;
    updatedAt: string;
  };
}

export async function getMe(account: Pick<Account, 'accessToken'>) {
  const response = await apiRequest<{ stats: Record<string, number> }>('/me', {
    token: account.accessToken,
  });
  expect(response.status).toBe(200);
  return response.body;
}

export async function getProgressItems(
  account: Pick<Account, 'accessToken'>,
): Promise<ProgressItem[]> {
  const response = await apiRequest<{ items: ProgressItem[] }>('/me/progress?limit=50', {
    token: account.accessToken,
  });
  expect(response.status).toBe(200);
  return response.body.items;
}

export async function getSavedItems(account: Pick<Account, 'accessToken'>) {
  const response = await apiRequest<{ items: Array<{ slug: string; id: string }>; total: number }>(
    '/me/saved?limit=50',
    { token: account.accessToken },
  );
  expect(response.status).toBe(200);
  return response.body;
}

/** Story ids/slugs used by the personal-feature journeys (catalogue is read-only seed data). */
export async function getSampleStories(
  count = 2,
): Promise<Array<{ id: string; slug: string; title: string }>> {
  const response = await apiRequest<{ items: Array<{ id: string; slug: string; title: string }> }>(
    `/stories?limit=${count}`,
  );
  expect(response.status).toBe(200);
  return response.body.items;
}
