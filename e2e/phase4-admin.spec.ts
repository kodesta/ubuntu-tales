import { expect, test } from '@playwright/test';

/**
 * Phase 4: the editorial console is role-gated, and a reader can reach the submission form.
 * Uses the seeded dev accounts (SEED_DEV_PASSWORD, default `ubuntu-tales-dev`).
 */
const PASSWORD = process.env.SEED_DEV_PASSWORD ?? 'ubuntu-tales-dev';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe('editorial console (Phase 4)', () => {
  test('readers are refused, editors get the console', async ({ page }) => {
    await signIn(page, 'kwame@ubuntutales.local');
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: /editors/i })).toBeVisible();

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await signIn(page, 'editor@ubuntutales.local');
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: /the console/i })).toBeVisible();
    await expect(page.getByText('Published tales')).toBeVisible();
  });

  test('editor can open a story and the moderation queue', async ({ page }) => {
    await signIn(page, 'editor@ubuntutales.local');

    await page.goto('/admin/stories', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('tbody tr').first()).toBeVisible();
    await page.locator('tbody tr a').first().click();
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible();

    await page.goto('/admin/moderation', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: /moderation/i })).toBeVisible();
  });

  test('a signed-in reader can reach the submission form', async ({ page }) => {
    await signIn(page, 'thandiwe@ubuntutales.local');
    await page.goto('/submit', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/your voice/i);
    await expect(page.getByRole('button', { name: /submit for review/i })).toBeVisible();

    await page.goto('/me/submissions', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/tales you have shared/i);
  });

  test('legal pages render with editorial copy', async ({ page }) => {
    await page.goto('/legal/privacy', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1, name: /privacy and data/i })).toBeVisible();
    await expect(page.getByText(/Roots and lineage are optional/i)).toBeVisible();
  });
});
