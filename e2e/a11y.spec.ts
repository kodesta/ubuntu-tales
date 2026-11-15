import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import {
  SAMPLE_STORY,
  fetchSavedSeed,
  openWithState,
  seedLocalStorage,
  waitForApp,
} from './support/state';

interface RouteTarget {
  label: string;
  path: string;
  seed: Parameters<typeof openWithState>[2] | null;
}

/**
 * Accessibility gate (testing plan §1): axe-core on the six key routes. Serious/critical
 * violations are release blockers; moderate/minor findings are attached to the report for triage.
 */
const ROUTES: RouteTarget[] = [
  { label: 'welcome', path: '/welcome', seed: null },
  { label: 'home', path: '/', seed: { tribe: { slug: 'zulu', name: 'Zulu' }, follows: ['zulu'] } },
  { label: 'tribes', path: '/tribes', seed: {} },
  { label: 'reader', path: `/stories/${SAMPLE_STORY.slug}`, seed: {} },
  { label: 'library', path: '/library', seed: {} },
  { label: 'saved', path: '/saved', seed: null },
];

async function scan(page: Page, label: string) {
  // Let fonts, images and the reading-progress write settle so axe measures the final layout.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(350);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  const all = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      summary: node.failureSummary,
    })),
  }));

  await test.info().attach(`axe-${label}.json`, {
    body: JSON.stringify({ url: page.url(), violations: all }, null, 2),
    contentType: 'application/json',
  });

  if (all.length > 0) {
    console.log(`[axe:${label}] ${all.map((v) => `${v.impact}:${v.id}`).join(', ')}`);
  }

  return all;
}

test.describe('accessibility (axe-core)', () => {
  for (const route of ROUTES) {
    test(`axe: ${route.label} has no serious/critical violations`, async ({ page, request }) => {
      if (route.label === 'saved') {
        const saved = await fetchSavedSeed(request, 2);
        await openWithState(page, route.path, { saved });
      } else if (route.seed) {
        await openWithState(page, route.path, route.seed);
      } else {
        await seedLocalStorage(page, { onboarded: false });
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await waitForApp(page);
      }

      const violations = await scan(page, route.label);
      const blocking = violations.filter(
        (violation) => violation.impact === 'serious' || violation.impact === 'critical',
      );

      expect(
        blocking,
        `Serious/critical axe violations on ${route.path}:\n${JSON.stringify(blocking, null, 2)}`,
      ).toEqual([]);
    });
  }

  test('axe: library voices tab', async ({ page }) => {
    await openWithState(page, '/library?tab=authors');
    const violations = await scan(page, 'library-voices');
    const blocking = violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
});
