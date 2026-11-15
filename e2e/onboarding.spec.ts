import { expect, test } from '@playwright/test';

import { LOW_STORY_TRIBE, readStorage, seedLocalStorage, waitForApp } from './support/state';

/**
 * Journey 1 (testing plan §4.1): first visit → welcome → choose your roots (low-story publication
 * shows the dialog) → begin reading → home is personalised.
 */
test.describe('onboarding', () => {
  test('first visit lands on /welcome and offers both ways in', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/welcome$/);
    await waitForApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Stories your grandmother knew.',
    );
    await expect(page.getByRole('link', { name: 'Choose your roots' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Just start reading' })).toBeVisible();
    // The right-hand artwork composition is editorial evidence, not decoration-only.
    await expect(page.getByText('Tale of the day')).toBeVisible();
    await expect(page.getByRole('link', { name: /Read the tale/ }).first()).toBeVisible();
  });

  test('choosing a low-story publication shows the dialog, then home is personalised', async ({
    page,
  }) => {
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);

    await page.getByRole('link', { name: 'Choose your roots' }).click();
    await expect(page).toHaveURL(/\/tribes\?onboarding=1/);
    await expect(page.getByText('Step 1 of 1 · Your roots')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin reading' })).toBeDisabled();

    // Shona has a single tale: selecting it must open the low-story dialog instead of a dead end.
    await page.getByRole('button', { name: new RegExp(LOW_STORY_TRIBE.name) }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('The fire is still being built.')).toBeVisible();
    await expect(dialog.getByText(/Shona has only 1 tale so far/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Choose anyway' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByText(`Your roots: ${LOW_STORY_TRIBE.name}`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Begin reading' })).toBeEnabled();
    await page.getByRole('button', { name: 'Begin reading' }).click();

    await expect(page).toHaveURL(/\/$/);
    await waitForApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(page.getByText('Welcome back, Shona reader.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'More from Shona' })).toBeVisible();

    const tribe = await readStorage<{ state: { slug: string; name: string } }>(page, 'ut.tribe');
    expect(tribe?.state).toMatchObject({ slug: LOW_STORY_TRIBE.slug, name: LOW_STORY_TRIBE.name });
    const follows = await readStorage<{ state: { slugs: string[] } }>(page, 'ut.follows');
    expect(follows?.state.slugs).toContain(LOW_STORY_TRIBE.slug);
    const onboarded = await readStorage<{ state: { onboarded: boolean } }>(page, 'ut.onboarded');
    expect(onboarded?.state.onboarded).toBe(true);
  });

  test('"Just start reading" completes onboarding without a tribe', async ({ page }) => {
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Just start reading' }).click();

    await expect(page).toHaveURL(/\/$/);
    await waitForApp(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(
      page.getByRole('heading', { name: 'Choose your roots to personalise this feed.' }),
    ).toBeVisible();

    // Revisiting /welcome after onboarding redirects home (design doc §7.1).
    await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/$/);
  });

  test('an onboarded reader skips /welcome and lands on home', async ({ page }) => {
    await seedLocalStorage(page, { tribe: { slug: 'zulu', name: 'Zulu' } });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForApp(page);
    await expect(page.getByText('Welcome back, Zulu reader.')).toBeVisible();
  });
});
