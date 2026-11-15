import { expect, test } from '@playwright/test';

import { getSampleStories, registerAccount, waitForSignedIn } from './support/accounts';

interface ConsoleFinding {
  type: string;
  text: string;
}

/** The guest boot refresh is an expected 401 network response, not a JS error (see DEVIATIONS). */
function isExpectedBootNoise(text: string): boolean {
  return /401 \(Unauthorized\)/.test(text) || /\/auth\/refresh/.test(text);
}

/**
 * Phase 2 console cleanliness: signed-in journey across the shell, reader, account and settings
 * pages. Uncaught page errors / console errors must be zero; the expected boot 401 is filtered.
 */
test.describe('phase 2 console cleanliness', () => {
  test('signed-in journey produces no JS errors', async ({ page }) => {
    const account = await registerAccount({ displayName: 'Console QA', verify: true });
    const [story] = await getSampleStories(1);

    const pageErrors: string[] = [];
    const consoleErrors: ConsoleFinding[] = [];
    const consoleWarnings: ConsoleFinding[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (message) => {
      const entry = { type: message.type(), text: message.text() };
      if (entry.type === 'error' && !isExpectedBootNoise(entry.text)) consoleErrors.push(entry);
      if (entry.type === 'warning') consoleWarnings.push(entry);
    });

    // Guest boot first (one expected refresh 401), then sign-in and the account journey.
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back.');
    await page.locator('#login-email').fill(account.email);
    await page.locator('#login-password').fill(account.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/$/);
    await waitForSignedIn(page);

    await page.goto('/saved', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await page.goto('/library', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The library.');
    await page.goto('/tribes', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose the voices you want to hear.',
    );
    await page.goto(`/stories/${story.slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(story.title);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(400);
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Your account, in your hands.',
    );

    // Account menu + sign out are part of the shell journey.
    await page
      .locator('header')
      .first()
      .getByRole('button', { name: /account menu/i })
      .click();
    await expect(page.locator('#account-menu-panel')).toBeVisible();
    await page.locator('#account-menu-panel').getByRole('button', { name: 'Sign out' }).click();
    await expect(
      page.locator('header').first().getByRole('link', { name: 'Sign in', exact: true }),
    ).toBeVisible();

    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Console errors:\n${JSON.stringify(consoleErrors, null, 2)}`).toEqual([]);
    if (consoleWarnings.length > 0) {
      console.log(
        `[console] ${consoleWarnings.length} warning(s): ${consoleWarnings
          .map((warning) => warning.text)
          .join(' | ')}`,
      );
    }
  });
});
