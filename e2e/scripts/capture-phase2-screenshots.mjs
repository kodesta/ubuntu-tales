import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addRefreshCookie,
  apiJson,
  loginViaApi,
  registerAccount,
  sampleStories,
  WEB_URL,
} from './lib/accounts.mjs';

/**
 * Captures the Phase 2 visual evidence: auth screens + signed-in account surfaces at 390×844 and
 * 1440×900. Output: docs/qa/screenshots/phase-2/ + contact-sheet index.html.
 *
 * Usage (from the repo root, API :4100 + web :5173 running and seeded):
 *   node e2e/scripts/capture-phase2-screenshots.mjs
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(ROOT, '.playwright-browsers');

const { chromium } = await import('@playwright/test');

const OUT_DIR = path.join(ROOT, 'docs/qa/screenshots/phase-2');
const DEVICES = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

/* ------------------------------------------------------------------ accounts + data ----------- */

// The reader shown on the account screens (verified, roots chosen, some reading history).
const account = await registerAccount({
  displayName: 'Naledi Mokoena',
  tribeSlug: 'zulu',
  communityRole: 'STORYTELLER',
  verify: true,
});
const [storyA, storyB, storyC] = await sampleStories(3);

async function api(path, options = {}) {
  const response = await apiJson(path, { ...options, token: account.accessToken });
  if (response.status >= 400) {
    throw new Error(`${options.method ?? 'GET'} ${path} -> ${response.status}`);
  }
  return response;
}

await api(`/me/saved/${storyA.id}`, { method: 'PUT' });
await api(`/me/saved/${storyB.id}`, { method: 'PUT' });
await api(`/me/progress/${storyA.id}`, {
  method: 'PUT',
  body: {
    percent: 42,
    lastSentenceId: 's_0005',
    audioPositionMs: 0,
    listenedDeltaSec: 0,
    clientUpdatedAt: new Date().toISOString(),
  },
});
await api(`/me/progress/${storyB.id}/complete`, { method: 'POST' });
await api(`/stories/${storyB.id}/reactions`, { method: 'PUT', body: { type: 'JOY' } });

// Two other readers react so the completion screen shows a public count.
for (const reaction of ['JOY', 'GREAT']) {
  const reader = await registerAccount({ displayName: `Reader ${reaction}`, verify: true });
  const response = await apiJson(`/stories/${storyB.id}/reactions`, {
    method: 'PUT',
    token: reader.accessToken,
    body: { type: reaction },
  });
  if (response.status !== 200) console.error('[phase2-screenshots] reaction seed failed');
}

const unverified = await registerAccount({ displayName: 'New Reader', verify: false });

const ROUTES = [
  { name: 'login', path: '/login', note: 'Sign-in page: editorial split, form, dev reader chips.' },
  {
    name: 'signup',
    path: '/signup',
    note: 'Open-account page: optional roots/consents, assurances.',
  },
  {
    name: 'verify-email',
    path: '/verify-email?sent=1',
    account: unverified,
    note: 'Verification letter sent state for a newly opened account.',
  },
  {
    name: 'profile',
    path: '/profile',
    note: 'Account page: identity, stats, editable details, roots.',
  },
  {
    name: 'settings',
    path: '/settings',
    note: 'Settings: password, devices, on-device data, privacy.',
  },
  {
    name: 'home-signed-in',
    path: '/',
    note: 'Signed-in home with the account menu open (avatar, profile/settings/sign-out).',
    prepare: async (page) => {
      await page
        .locator('header')
        .first()
        .getByRole('button', { name: /account menu/i })
        .click();
      await page.locator('#account-menu-panel').waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'saved-signed-in',
    path: '/saved',
    note: 'Account reading list: saved tales with a progress hairline and filters.',
  },
  {
    name: 'complete-reactions',
    path: `/stories/${storyB.slug}/complete`,
    note: 'End of tale signed in: reaction counts, wisdom, account stats and recommendations.',
  },
];

function waitForPageReady(page) {
  return page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 });
}

async function waitForImagesAndFonts(page) {
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
  await page.waitForTimeout(800);
}

await mkdir(OUT_DIR, { recursive: true });

const manifest = [];
let browser;

try {
  browser = await chromium.launch();
} catch (error) {
  console.error('[phase2-screenshots] Could not launch Chromium:', error.message);
  process.exit(1);
}

for (const device of DEVICES) {
  for (const route of ROUTES) {
    const context = await browser.newContext({
      baseURL: WEB_URL,
      viewport: device.viewport,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      deviceScaleFactor: 1,
      locale: 'en-GB',
      timezoneId: 'Africa/Johannesburg',
      colorScheme: 'light',
    });

    // Fresh login session per screenshot: boot refresh rotates the cookie, so reusing one across
    // contexts would trigger the server's reuse detection and sign the other contexts out.
    const session = await loginViaApi(
      (route.account ?? account).email,
      (route.account ?? account).password,
    );
    await addRefreshCookie(context, session.refreshToken);

    const page = await context.newPage();
    const file = `${route.name}-${device.name}-${device.viewport.width}x${device.viewport.height}.png`;
    const target = path.join(OUT_DIR, file);

    try {
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForPageReady(page);
      await page.waitForTimeout(700);
      await waitForImagesAndFonts(page);
      if (route.prepare) await route.prepare(page);
      await page.screenshot({ path: target, fullPage: false, animations: 'disabled' });
      manifest.push({
        ...route,
        prepare: undefined,
        account: undefined,
        device: device.name,
        file,
        width: device.viewport.width,
        height: device.viewport.height,
      });
      console.log(`[phase2-screenshots] ${file}`);
    } catch (error) {
      console.error(`[phase2-screenshots] FAILED ${route.path} (${device.name}):`, error.message);
    } finally {
      await context.close();
    }
  }
}

await browser.close();

const byRoute = new Map();
for (const shot of manifest) {
  if (!byRoute.has(shot.name)) byRoute.set(shot.name, {});
  byRoute.get(shot.name)[shot.device] = shot;
}

const cards = [...byRoute.entries()]
  .map(([name, shots], index) => {
    const order = ROUTES.find((route) => route.name === name);
    const cell = (device) => {
      const shot = shots[device];
      if (!shot) return '<div class="missing">not captured</div>';
      return `<a class="shot" href="${shot.file}" target="_blank" rel="noreferrer">
        <img src="${shot.file}" alt="${name} at ${shot.width}×${shot.height}" loading="lazy" />
        <span class="caption">${device} · ${shot.width}×${shot.height}</span>
      </a>`;
    };
    return `<article class="card" id="${name.replace(/[^a-z0-9]+/gi, '-')}">
      <header>
        <p class="index">${String(index + 1).padStart(2, '0')}</p>
        <div>
          <h2>${name}</h2>
          <p class="route"><code>${order?.path ?? ''}</code></p>
          <p class="note">${order?.note ?? ''}</p>
        </div>
      </header>
      <div class="pair">
        <div class="column"><h3>Mobile · 390×844</h3>${cell('mobile')}</div>
        <div class="column"><h3>Desktop · 1440×900</h3>${cell('desktop')}</div>
      </div>
    </article>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ubuntu Tales — Phase 2 screenshot contact sheet</title>
<style>
  :root { color-scheme: light; --paper: #fbf7f0; --ink: #1e1a17; --muted: #6b6056; --line: #e5dbcc; --terracotta: #b4472c; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: ui-sans-serif, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 1560px; margin: 0 auto; padding: 40px clamp(16px, 4vw, 48px) 80px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: clamp(2rem, 4vw, 3rem); margin: 0 0 8px; letter-spacing: -0.01em; }
  .lede { color: var(--muted); max-width: 70ch; line-height: 1.6; margin: 0 0 8px; }
  .meta { color: var(--muted); font-size: 0.85rem; margin: 0 0 40px; }
  .card { border-top: 1px solid var(--line); padding: 28px 0 40px; }
  .card header { display: flex; gap: 20px; align-items: baseline; margin-bottom: 18px; }
  .index { font-family: Georgia, serif; color: var(--terracotta); font-size: 1.1rem; margin: 0; }
  .card h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 1.5rem; margin: 0 0 4px; }
  .route { margin: 0 0 4px; color: var(--muted); }
  .route code { background: #f4ecdf; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; }
  .note { margin: 0; color: var(--muted); max-width: 90ch; line-height: 1.5; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
  .column h3 { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.09em; color: var(--muted); margin: 0 0 10px; }
  .shot { display: block; text-decoration: none; color: inherit; border: 1px solid var(--line); background: #fffdf9; padding: 10px; border-radius: 6px; }
  .shot img { display: block; width: 100%; height: auto; border: 1px solid var(--line); }
  .caption { display: block; margin-top: 8px; font-size: 0.8rem; color: var(--muted); }
  .missing { border: 1px dashed var(--line); padding: 40px; color: var(--muted); text-align: center; }
  @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <h1>Ubuntu Tales — Phase 2 screenshot contact sheet</h1>
  <p class="lede">Auth screens and signed-in account surfaces captured at the mobile (390×844) and
  desktop (1440×900) breakpoints, from the running app (Vite :5173 + API :4100, seeded catalogue)
  with Playwright Chromium. Click any image to open the full-resolution PNG.</p>
  <p class="meta">Generated ${new Date().toISOString()} · ${manifest.length} screenshots · see <code>docs/qa/phase-2-report.md</code> for the review notes.</p>
  ${cards}
</main>
</body>
</html>
`;

await writeFile(path.join(OUT_DIR, 'index.html'), html, 'utf8');
await writeFile(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      webUrl: WEB_URL,
      accountEmail: account.email,
      screenshots: manifest,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(
  `\n[phase2-screenshots] ${manifest.length} screenshots written to ${path.relative(ROOT, OUT_DIR)}`,
);
console.log('[phase2-screenshots] contact sheet: docs/qa/screenshots/phase-2/index.html');
