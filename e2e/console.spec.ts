import { expect, test } from '@playwright/test';

import { SAMPLE_STORY, fetchSavedSeed, openWithState } from './support/state';

interface ConsoleFinding {
  type: string;
  text: string;
}

/**
 * Console cleanliness on core journeys: no uncaught page errors and no console errors. Warnings
 * are collected too (React/router dev warnings are actionable) and surfaced in the report.
 */
test.describe('console cleanliness', () => {
  test('home → publication → reader → complete → library → saved → griot → 404', async ({
    page,
    request,
    isMobile,
  }) => {
    const errors: ConsoleFinding[] = [];
    const warnings: ConsoleFinding[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      const entry = { type: message.type(), text: message.text() };
      if (entry.type === 'error') errors.push(entry);
      if (entry.type === 'warning') warnings.push(entry);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const saved = await fetchSavedSeed(request, 1);

    // 1. Welcome (fresh visitor) → home via "Just start reading".
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Just start reading' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');

    // 2. Publications index → publication page.
    const primaryNav = page.getByRole('navigation', {
      name: isMobile ? 'Primary mobile' : 'Primary',
    });
    await primaryNav.getByRole('link', { name: 'Publications' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose the voices you want to hear.',
    );
    await page.getByRole('link', { name: /Zulu/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zulu');

    // 3. Reader → complete.
    await page.getByRole('link', { name: SAMPLE_STORY.title, exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(SAMPLE_STORY.title);
    await page.getByRole('button', { name: /Increase text size/ }).click();
    await page
      .locator('main header')
      .first()
      .getByRole('button', { name: 'Save to your reading list' })
      .click();
    await page.getByRole('button', { name: 'Finish tale' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'You have finished this tale.',
    );
    await page.getByRole('button', { name: /^Joy/ }).click();

    // 4. SPA navigation through the shell routes.
    await page.goto(`/library`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The library.');
    await page.getByRole('tab', { name: 'Voices' }).click();
    await expect(page.locator('main a[href^="/authors/"]').first()).toBeVisible();
    await page.locator('main a[href^="/authors/"]').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/saved', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    // The reader save above lands on this device reading list.
    await expect(page.locator('main article')).toHaveCount(1);

    await page.goto('/this/path/grew/over', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This path has grown over.');

    expect(pageErrors, `Uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(errors, `Console errors:\n${JSON.stringify(errors, null, 2)}`).toEqual([]);

    // React/router dev warnings are not shipped to production bundles but should still be rare.
    if (warnings.length > 0) {
      console.log(
        `[console] ${warnings.length} warning(s): ${warnings.map((w) => w.text).join(' | ')}`,
      );
    }
  });
});
