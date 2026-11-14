import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import {
  apiRequest,
  getSampleStories,
  openSignedIn,
  registerAccount,
  signInBrowserContext,
  awaitBootRefresh,
  waitForSignedIn,
} from './support/accounts';

/**
 * Phase 2 accessibility gate (axe-core, WCAG 2.0/2.1/2.2 A+AA): the new auth/account screens plus
 * signed-in variants of the key routes. Serious/critical violations are release blockers;
 * moderate/minor findings are attached for triage.
 */
interface RouteTarget {
  label: string;
  path: string;
  mode: 'guest' | 'account' | 'account-with-saved';
}

const ROUTES: RouteTarget[] = [
  { label: 'login', path: '/login', mode: 'guest' },
  { label: 'signup', path: '/signup', mode: 'guest' },
  { label: 'verify-email', path: '/verify-email?sent=1', mode: 'guest' },
  { label: 'forgot-password', path: '/forgot-password', mode: 'guest' },
  { label: 'profile', path: '/profile', mode: 'account' },
  { label: 'settings', path: '/settings', mode: 'account' },
  { label: 'home-signed-in', path: '/', mode: 'account' },
  { label: 'saved-signed-in', path: '/saved', mode: 'account-with-saved' },
];

async function scan(page: Page, label: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

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

  await test.info().attach(`axe-phase2-${label}.json`, {
    body: JSON.stringify({ url: page.url(), violations: all }, null, 2),
    contentType: 'application/json',
  });

  if (all.length > 0) {
    console.log(`[axe:phase2:${label}] ${all.map((v) => `${v.impact}:${v.id}`).join(', ')}`);
  }
  return all;
}

test.describe('phase 2 accessibility (axe-core)', () => {
  for (const route of ROUTES) {
    test(`axe: ${route.label} has no serious/critical violations`, async ({ page }) => {
      let account: Awaited<ReturnType<typeof registerAccount>> | null = null;

      if (route.mode === 'guest') {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await expect(page.locator('main h1').first()).toBeVisible();
      } else {
        account = await registerAccount({ displayName: `A11y ${route.label}`, verify: true });
        if (route.mode === 'account-with-saved') {
          const [story] = await getSampleStories(1);
          const save = await apiRequest(`/me/saved/${story.id}`, {
            method: 'PUT',
            token: account.accessToken,
          });
          expect(save.status).toBe(200);
        }
        await openSignedIn(page, route.path, account);
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
});
