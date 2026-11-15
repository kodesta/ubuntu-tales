/**
 * Shared helpers for the standalone evidence scripts (Node, no test runner).
 *
 * The API mints disposable accounts and returns the httpOnly refresh cookie in Set-Cookie; the
 * scripts replay that cookie into a Playwright context so authenticated screens are captured in
 * exactly the session shape the app uses in production (no tokens in localStorage).
 */

export const API_URL = process.env.API_URL ?? 'http://localhost:4100/api/v1';
export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
export const DEV_PASSWORD = 'ubuntu-tales-dev';

export function uniqueEmail(prefix = 'qa') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ubuntutales.local`;
}

function readSetCookies(response) {
  if (typeof response.headers.getSetCookie === 'function') return response.headers.getSetCookie();
  const single = response.headers.get('set-cookie');
  return single ? [single] : [];
}

function readRefreshToken(setCookies) {
  for (const cookie of setCookies) {
    const match = /(?:^|;\s*)refresh_token=([^;]+)/.exec(cookie);
    if (match) return decodeURIComponent(match[1]);
  }
  throw new Error('The API did not set a refresh_token cookie.');
}

export async function apiJson(path, { method = 'GET', token, body, headers } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed, setCookies: readSetCookies(response) };
}

export async function listTribes() {
  const response = await apiJson('/tribes');
  if (response.status !== 200) throw new Error(`GET /tribes returned ${response.status}`);
  return response.body;
}

export async function findTribeId(slug) {
  const tribes = await listTribes();
  const match = tribes.find((tribe) => tribe.slug === slug);
  if (!match) throw new Error(`Tribe ${slug} not found in the seeded catalogue.`);
  return match.id;
}

export async function sampleStories(count = 2) {
  const response = await apiJson(`/stories?limit=${count}`);
  if (response.status !== 200) throw new Error(`GET /stories returned ${response.status}`);
  return response.body.items;
}

export async function registerAccount({
  displayName = 'QA Evidence',
  email = uniqueEmail('qa-evidence'),
  password = DEV_PASSWORD,
  verify = true,
  tribeSlug,
  communityRole,
} = {}) {
  const body = {
    displayName,
    email,
    password,
    acceptTerms: true,
    acceptPrivacy: true,
    confirmAge13Plus: true,
  };
  if (tribeSlug) {
    body.tribeId = await findTribeId(tribeSlug);
    body.consentLineagePersonalisation = true;
  }
  if (communityRole) body.communityRole = communityRole;

  const response = await apiJson('/auth/register', { method: 'POST', body });
  if (response.status !== 201) {
    throw new Error(`register failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  const account = {
    displayName,
    email,
    password,
    userId: response.body.user.id,
    accessToken: response.body.accessToken,
    refreshToken: readRefreshToken(response.setCookies),
    devEmailToken: response.body.devEmailToken,
  };

  if (verify) {
    const verified = await apiJson('/auth/verify-email', {
      method: 'POST',
      body: { token: account.devEmailToken },
    });
    if (verified.status !== 200) {
      throw new Error(`verify failed (${verified.status}): ${JSON.stringify(verified.body)}`);
    }
  }

  return account;
}

export async function loginViaApi(email, password = DEV_PASSWORD) {
  const response = await apiJson('/auth/login', { method: 'POST', body: { email, password } });
  if (response.status !== 200) {
    throw new Error(`login failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return {
    accessToken: response.body.accessToken,
    refreshToken: readRefreshToken(response.setCookies),
    user: response.body.user,
  };
}

export async function addRefreshCookie(context, refreshToken) {
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

/** Seeds Zustand-persist envelopes into localStorage (guest-era keys). */
export async function seedGuestState(page, entries) {
  await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
  await page.evaluate((payload) => {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(payload)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}

export async function waitForPageReady(page) {
  await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    await Promise.race([
      Promise.all(
        images.map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              }),
        ),
      ),
      new Promise((resolve) => setTimeout(resolve, 5_000)),
    ]);
  });
  await page.waitForTimeout(600);
}

export function slugify(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '');
}
