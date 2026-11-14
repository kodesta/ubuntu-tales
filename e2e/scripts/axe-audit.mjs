import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Standalone axe-core audit of the Phase 1 key routes.
 *
 * Usage (from the repo root, API :4100 + web :5173 running and seeded):
 *   node e2e/scripts/axe-audit.mjs
 *
 * Output:
 *   docs/qa/axe-results.json  — every violation with impact, help and affected selectors
 *   docs/qa/axe-summary.md    — human-readable table for the Phase 1 report
 * Exit code: 0 always (this is evidence gathering); the Playwright `a11y.spec.ts` gate fails CI.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(ROOT, '.playwright-browsers');

const { chromium } = await import('@playwright/test');
const AxeBuilder = (await import('@axe-core/playwright')).default;

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';
const API_URL = process.env.API_URL ?? 'http://localhost:4100/api/v1';
const QA_DIR = path.join(ROOT, 'docs/qa');
const STORY_SLUG = 'unogwaja-and-the-lions-well';

const persisted = (state) => ({ state, version: 0 });
const baseSeed = {
  'ut.onboarded': persisted({ onboarded: true }),
  'ut.tribe': persisted({ slug: 'zulu', name: 'Zulu' }),
  'ut.follows': persisted({ slugs: ['zulu'] }),
};

const storiesResponse = await fetch(`${API_URL}/stories?limit=2`);
const storiesPayload = await storiesResponse.json();
const savedEntries = storiesPayload.items.map((story, index) => ({
  story,
  savedAt: new Date(Date.now() - index * 60_000).toISOString(),
}));

const ROUTES = [
  {
    label: 'welcome',
    path: '/welcome',
    seed: { ...baseSeed, 'ut.onboarded': persisted({ onboarded: false }) },
  },
  { label: 'home', path: '/', seed: baseSeed },
  { label: 'tribes', path: '/tribes', seed: baseSeed },
  { label: 'reader', path: `/stories/${STORY_SLUG}`, seed: baseSeed },
  { label: 'library', path: '/library', seed: baseSeed },
  { label: 'library-voices', path: '/library?tab=authors', seed: baseSeed },
  {
    label: 'saved',
    path: '/saved',
    seed: { ...baseSeed, 'ut.saved': persisted({ entries: savedEntries }) },
  },
  { label: 'complete', path: `/stories/${STORY_SLUG}/complete`, seed: baseSeed },
  { label: 'not-found', path: '/a-path-that-grew-over', seed: baseSeed },
];

await mkdir(QA_DIR, { recursive: true });

const browser = await chromium.launch();
const reports = [];

for (const device of [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
]) {
  for (const route of ROUTES) {
    const context = await browser.newContext({
      baseURL: WEB_URL,
      viewport: device.viewport,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      locale: 'en-GB',
      colorScheme: 'light',
      timezoneId: 'Africa/Johannesburg',
    });
    await context.addInitScript((entries) => {
      for (const [key, value] of Object.entries(entries)) {
        if (window.localStorage.getItem(key) === null) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    }, route.seed);

    const page = await context.newPage();
    try {
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);

      const result = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      const violations = result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        description: violation.description,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary,
        })),
      }));

      reports.push({
        device: device.name,
        label: route.label,
        path: route.path,
        url: page.url(),
        violations,
      });
      const blocking = violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );
      console.log(
        `[axe] ${device.name.padEnd(7)} ${route.label.padEnd(14)} total=${violations.length} serious/critical=${blocking.length}${
          blocking.length ? ` (${blocking.map((violation) => violation.id).join(', ')})` : ''
        }`,
      );
    } catch (error) {
      console.error(`[axe] FAILED ${route.label} (${device.name}):`, error.message);
      reports.push({
        device: device.name,
        label: route.label,
        path: route.path,
        error: error.message,
      });
    } finally {
      await context.close();
    }
  }
}

await browser.close();

const generatedAt = new Date().toISOString();
await writeFile(
  path.join(QA_DIR, 'axe-results.json'),
  JSON.stringify({ generatedAt, webUrl: WEB_URL, routes: reports }, null, 2),
  'utf8',
);

const rows = reports.map((report) => {
  const blocking = (report.violations ?? []).filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  const moderate = (report.violations ?? []).filter((violation) => violation.impact === 'moderate');
  const minor = (report.violations ?? []).filter((violation) => violation.impact === 'minor');
  return `| ${report.label} | ${report.device} | ${blocking.length} | ${moderate.length} | ${minor.length} | ${blocking.map((violation) => `${violation.id} (${violation.nodes.length})`).join(', ') || '—'} |`;
});

const md = `# axe-core audit — Phase 1 key routes

Generated ${generatedAt} by \`e2e/scripts/axe-audit.mjs\` against ${WEB_URL}.
Rules: WCAG 2.0/2.1/2.2 A + AA (\`wcag2a\`, \`wcag2aa\`, \`wcag21a\`, \`wcag21aa\`, \`wcag22aa\`).

| Route | Device | Serious/critical | Moderate | Minor | Blocking rule ids (node count) |
| --- | --- | ---: | ---: | ---: | --- |
${rows.join('\n')}

Full evidence with selectors and failure summaries: [axe-results.json](./axe-results.json).
`;

await writeFile(path.join(QA_DIR, 'axe-summary.md'), md, 'utf8');
console.log(`\n[axe] wrote docs/qa/axe-results.json and docs/qa/axe-summary.md`);
