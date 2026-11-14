import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  addRefreshCookie,
  apiJson,
  registerAccount,
  sampleStories,
  WEB_URL,
} from './lib/accounts.mjs';

/**
 * Layout / design QA audit: horizontal overflow, broken cover art, touch-target sizes, reader
 * measure and font availability at both breakpoints, for the Phase 1 routes and the new Phase 2
 * auth/account pages.
 *
 * Usage (from the repo root, API :4100 + web :5173 running and seeded):
 *   node e2e/scripts/layout-audit.mjs
 * Output: docs/qa/layout-audit.json (+ console summary).
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.join(ROOT, '.playwright-browsers');

const { chromium } = await import('@playwright/test');
const QA_DIR = path.join(ROOT, 'docs/qa');
const STORY_SLUG = 'unogwaja-and-the-lions-well';

const persisted = (state) => ({ state, version: 0 });
const baseSeed = {
  'ut.onboarded': persisted({ onboarded: true }),
  'ut.tribe': persisted({ slug: 'zulu', name: 'Zulu' }),
  'ut.follows': persisted({ slugs: ['zulu'] }),
};

const [savedStory] = await sampleStories(1);

const ROUTES = [
  {
    label: 'welcome',
    path: '/welcome',
    seed: { ...baseSeed, 'ut.onboarded': persisted({ onboarded: false }) },
  },
  { label: 'home', path: '/', seed: baseSeed },
  { label: 'tribes', path: '/tribes', seed: baseSeed },
  { label: 'tribes-zulu', path: '/tribes/zulu', seed: baseSeed },
  { label: 'reader', path: `/stories/${STORY_SLUG}`, seed: baseSeed },
  { label: 'library', path: '/library', seed: baseSeed },
  { label: 'library-voices', path: '/library?tab=authors', seed: baseSeed },
  { label: 'saved-guest', path: '/saved', seed: baseSeed },
  { label: 'complete-guest', path: `/stories/${STORY_SLUG}/complete`, seed: baseSeed },
  { label: 'not-found', path: '/a-path-that-grew-over', seed: baseSeed },
  { label: 'login', path: '/login', seed: null },
  { label: 'signup', path: '/signup', seed: null },
  { label: 'verify-email', path: '/verify-email?sent=1', seed: null },
  { label: 'forgot-password', path: '/forgot-password', seed: null },
  { label: 'profile', path: '/profile', signedIn: true },
  { label: 'settings', path: '/settings', signedIn: true },
  { label: 'home-signed-in', path: '/', signedIn: true },
  { label: 'saved-signed-in', path: '/saved', signedIn: true, preSave: true },
];

const DEVICES = [
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false },
];

await mkdir(QA_DIR, { recursive: true });
const browser = await chromium.launch();
const reports = [];

for (const device of DEVICES) {
  for (const route of ROUTES) {
    const context = await browser.newContext({
      baseURL: WEB_URL,
      viewport: device.viewport,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      locale: 'en-GB',
      colorScheme: 'light',
    });

    if (route.signedIn) {
      const account = await registerAccount({ displayName: `Layout ${route.label}`, verify: true });
      if (route.preSave) {
        await apiJson(`/me/saved/${savedStory.id}`, { method: 'PUT', token: account.accessToken });
      }
      await addRefreshCookie(context, account.refreshToken);
    } else if (route.seed) {
      await context.addInitScript((entries) => {
        for (const [key, value] of Object.entries(entries)) {
          if (window.localStorage.getItem(key) === null) {
            window.localStorage.setItem(key, JSON.stringify(value));
          }
        }
      }, route.seed);
    }

    const page = await context.newPage();
    try {
      await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForSelector('main h1', { state: 'visible', timeout: 30_000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);

      const metrics = await page.evaluate(() => {
        const vw = window.innerWidth;
        const isScrollable = (element) => {
          for (let node = element; node && node !== document.body; node = node.parentElement) {
            const style = getComputedStyle(node);
            if (['auto', 'scroll'].includes(style.overflowX)) return true;
          }
          return false;
        };
        const overflowers = [];
        for (const element of document.querySelectorAll('main *')) {
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.right > vw + 1 && !isScrollable(element)) {
            overflowers.push({
              tag: element.tagName.toLowerCase(),
              className: element.className?.toString().slice(0, 90) ?? '',
              right: Math.round(rect.right),
              text: (element.textContent ?? '').trim().slice(0, 60),
            });
            if (overflowers.length >= 10) break;
          }
        }

        const brokenImages = Array.from(document.images)
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.getAttribute('src') ?? '');
        const pendingLazyImages = Array.from(document.images).filter(
          (image) => !image.complete,
        ).length;

        const fontChecks = {
          lora: document.fonts.check('16px "Lora Variable"'),
          dmSans: document.fonts.check('16px "DM Sans Variable"'),
        };

        const readerArticle = document.querySelector('main article');
        const h1 = document.querySelector('main h1');
        const bodySentence = document.querySelector('[data-sentence-id]');

        const smallTargets = [];
        for (const element of document.querySelectorAll(
          'main button, main a[href], header a[href], header button',
        )) {
          const rect = element.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const style = getComputedStyle(element);
          if (style.visibility === 'hidden' || style.display === 'none') continue;
          if (rect.height < 44 || rect.width < 44) {
            const label =
              element.getAttribute('aria-label') ??
              (element.textContent ?? '').trim().slice(0, 40) ??
              element.tagName.toLowerCase();
            smallTargets.push({
              label,
              tag: element.tagName.toLowerCase(),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              inline: style.display === 'inline',
            });
          }
        }

        return {
          viewportWidth: vw,
          documentScrollWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > vw + 1,
          overflowers,
          brokenImages,
          pendingLazyImages,
          fontChecks,
          readerArticleWidth: readerArticle
            ? Math.round(readerArticle.getBoundingClientRect().width)
            : null,
          h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
          bodyFontSize: bodySentence ? getComputedStyle(bodySentence).fontSize : null,
          bodyLineHeight: bodySentence ? getComputedStyle(bodySentence).lineHeight : null,
          smallTargetCount: smallTargets.length,
          smallTargets: smallTargets.slice(0, 25),
        };
      });

      reports.push({ device: device.name, label: route.label, path: route.path, ...metrics });
      const flags = [];
      if (metrics.horizontalOverflow) flags.push('HORIZONTAL_OVERFLOW');
      if (metrics.brokenImages.length) flags.push('BROKEN_IMAGES');
      if (!metrics.fontChecks.lora || !metrics.fontChecks.dmSans) flags.push('MISSING_FONTS');
      console.log(
        `[layout] ${device.name.padEnd(7)} ${route.label.padEnd(17)} scrollWidth=${metrics.documentScrollWidth} overflows=${metrics.overflowers.length} brokenImgs=${metrics.brokenImages.length} smallTargets=${metrics.smallTargetCount} ${flags.join(',')}`,
      );
    } catch (error) {
      console.error(`[layout] FAILED ${route.label} (${device.name}):`, error.message);
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
await writeFile(
  path.join(QA_DIR, 'layout-audit.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), webUrl: WEB_URL, reports }, null, 2),
  'utf8',
);
console.log('\n[layout] wrote docs/qa/layout-audit.json');
