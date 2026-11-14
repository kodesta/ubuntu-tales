import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Captures the Phase 1 visual evidence: every key route at 390×844 and 1440×900.
 *
 * Usage (from the repo root, with API :4100 + web :5173 running and seeded):
 *   node e2e/scripts/capture-screenshots.mjs
 *
 * Output: docs/qa/screenshots/<route>-<device>-<width>x<height>.png + index.html contact sheet.
 * Browsers resolve from .playwright-browsers/ (override with PLAYWRIGHT_BROWSERS_PATH).
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(ROOT, '.playwright-browsers');

const { chromium } = await import('@playwright/test');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:4100/api/v1';
const OUT_DIR = path.join(ROOT, 'docs/qa/screenshots');

const STORY = {
  slug: 'unogwaja-and-the-lions-well',
  title: 'uNogwaja and the Lion’s Well',
};

const persisted = (state) => ({ state, version: 0 });

const baseSeed = {
  'ut.onboarded': persisted({ onboarded: true }),
  'ut.tribe': persisted({ slug: 'zulu', name: 'Zulu' }),
  'ut.follows': persisted({ slugs: ['zulu', 'yoruba'] }),
  'ut.fontSize': persisted({ size: 'md' }),
};

const DEVICES = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

async function loadSavedSeed() {
  const response = await fetch(`${API_URL}/stories?limit=2`);
  if (!response.ok) throw new Error(`API /stories returned ${response.status}`);
  const payload = await response.json();
  return payload.items.map((story, index) => ({
    story,
    savedAt: new Date(Date.now() - index * 60_000).toISOString(),
  }));
}

const savedSeed = await loadSavedSeed();

const ROUTES = [
  {
    name: 'welcome',
    path: '/welcome',
    seed: {
      ...baseSeed,
      'ut.onboarded': persisted({ onboarded: false }),
      'ut.tribe': persisted({ slug: null, name: null }),
      'ut.follows': persisted({ slugs: [] }),
    },
    note: 'First-visit onboarding (/welcome): editorial split, cover composition, tale-of-the-day card.',
  },
  {
    name: 'home',
    path: '/',
    seed: baseSeed,
    note: 'Home reading list: today’s tale hero, personalised band, feed, sidebar, discover rail.',
  },
  { name: 'tribes', path: '/tribes', seed: baseSeed, note: 'Publications index masthead, search, region pills, 2-up cards.' },
  {
    name: 'tribes-zulu',
    path: '/tribes/zulu',
    seed: baseSeed,
    note: 'Zulu publication page: accent masthead, numbered archive, subscribe.',
  },
  {
    name: 'reader',
    path: `/stories/${STORY.slug}`,
    seed: baseSeed,
    note: 'Reader: 680px measure, drop-cap-free Lora body, byline, cover, sticky top bar.',
  },
  { name: 'library', path: '/library', seed: baseSeed, note: 'The library archive: tabs, category pills, hairline tale rows.' },
  {
    name: 'library-voices',
    path: '/library?tab=authors',
    seed: baseSeed,
    note: 'Library Voices tab: griot rows with portraits, roles and affiliations.',
  },
  {
    name: 'saved',
    path: '/saved',
    seed: { ...baseSeed, 'ut.saved': persisted({ entries: savedSeed }) },
    note: 'Reading list: two saved tales, filters, on-device note.',
  },
  {
    name: 'complete',
    path: `/stories/${STORY.slug}/complete`,
    seed: {
      ...baseSeed,
      'ut.reactions': persisted({ bySlug: { [STORY.slug]: 'JOY' } }),
      'ut.progress': persisted({
        bySlug: { [STORY.slug]: { percent: 100, updatedAt: new Date().toISOString() } },
      }),
    },
    note: 'End of tale: Ubuntu!, reaction picker, wisdom quote, recommendations.',
  },
  {
    name: 'not-found',
    path: '/a-path-that-grew-over',
    seed: baseSeed,
    note: 'Editorial 404 inside the app shell.',
  },
];

function slugify(value) {
  return value.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '');
}

async function waitForStablePage(page) {
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
  // Let query-driven layout, scroll-tracked progress and entrance transitions settle.
  await page.waitForTimeout(700);
}

await mkdir(OUT_DIR, { recursive: true });

const manifest = [];
let browser;

try {
  browser = await chromium.launch();
} catch (error) {
  console.error('[screenshots] Could not launch Chromium:', error.message);
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

    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        if (window.localStorage.getItem(key) === null) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    }, route.seed);

    const page = await context.newPage();
    const file = `${route.name}-${device.name}-${device.viewport.width}x${device.viewport.height}.png`;
    const target = path.join(OUT_DIR, file);

    try {
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForStablePage(page);
      await page.screenshot({ path: target, fullPage: false, animations: 'disabled' });
      manifest.push({ ...route, device: device.name, file, width: device.viewport.width, height: device.viewport.height });
      console.log(`[screenshots] ${file}`);
    } catch (error) {
      console.error(`[screenshots] FAILED ${route.path} (${device.name}):`, error.message);
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
    const pathLabel = order?.path ?? name;
    const note = order?.note ?? '';
    const cell = (device) => {
      const shot = shots[device];
      if (!shot) return '<div class="missing">not captured</div>';
      return `<a class="shot" href="${shot.file}" target="_blank" rel="noreferrer">
        <img src="${shot.file}" alt="${name} at ${shot.width}×${shot.height}" loading="lazy" />
        <span class="caption">${device} · ${shot.width}×${shot.height}</span>
      </a>`;
    };
    return `<article class="card" id="${slugify(name)}">
      <header>
        <p class="index">${String(index + 1).padStart(2, '0')}</p>
        <div>
          <h2>${name}</h2>
          <p class="route"><code>${pathLabel}</code></p>
          <p class="note">${note}</p>
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
<title>Ubuntu Tales — Phase 1 screenshot contact sheet</title>
<style>
  :root { color-scheme: light; --paper: #fbf7f0; --ink: #1e1a17; --muted: #7a6e63; --line: #e5dbcc; --terracotta: #b4472c; }
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
  <h1>Ubuntu Tales — Phase 1 screenshot contact sheet</h1>
  <p class="lede">Ten key routes captured at the mobile (390×844) and desktop (1440×900) breakpoints.
  Captured from the running app (Vite :5173 + API :4100, seeded catalogue) with Playwright Chromium.
  Click any image to open the full-resolution PNG.</p>
  <p class="meta">Generated ${new Date().toISOString()} · ${manifest.length} screenshots · see <code>docs/qa/phase-1-report.md</code> for the review notes.</p>
  ${cards}
</main>
</body>
</html>
`;

await writeFile(path.join(OUT_DIR, 'index.html'), html, 'utf8');
await writeFile(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), webUrl: WEB_URL, apiUrl: API_URL, screenshots: manifest }, null, 2),
  'utf8',
);

console.log(`\n[screenshots] ${manifest.length} screenshots written to ${path.relative(ROOT, OUT_DIR)}`);
console.log(`[screenshots] contact sheet: ${path.relative(ROOT, path.join(OUT_DIR, 'index.html'))}`);
