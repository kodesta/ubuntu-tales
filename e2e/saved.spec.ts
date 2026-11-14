import { expect, test } from '@playwright/test';

import { fetchSavedSeed, getJson, openWithState } from './support/state';

interface StoryCardLike {
  title: string;
  slug: string;
}

test.describe('saved reading list', () => {
  test('lists saved tales, filters by progress and unsaves a row', async ({ page, request }) => {
    const seedEntries = await fetchSavedSeed(request, 2);
    const titles = seedEntries.map((entry) => (entry.story as StoryCardLike).title);

    await openWithState(page, '/saved', { saved: seedEntries });

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(page.getByText('2 tales kept on this device')).toBeVisible();
    await expect(page.locator('main article')).toHaveCount(2);
    for (const title of titles) {
      await expect(page.getByRole('link', { name: title })).toBeVisible();
    }

    // Filter state lives in the URL.
    await page.getByRole('button', { name: 'In progress' }).click();
    await expect(page).toHaveURL(/filter=in-progress/);
    await expect(page.getByText('Nothing in progress.')).toBeVisible();
    await page.getByRole('button', { name: 'See all saved tales' }).click();
    await expect(page).toHaveURL(/filter=all/);

    // Offline is deliberately disabled until downloads land (design doc §7.8); the deep link
    // still renders the explanatory empty state.
    await expect(page.getByRole('button', { name: /Offline/ })).toBeDisabled();
    await page.goto('/saved?filter=offline', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Offline reading is coming.')).toBeVisible();
    await page.getByRole('button', { name: 'See all saved tales' }).click();
    await expect(page).toHaveURL(/filter=all/);

    // Unsaving from a row removes it immediately, with a toast.
    await page.getByRole('button', { name: 'Remove from your reading list' }).first().click();
    await expect(page.getByText('Removed from your reading list.')).toBeVisible();
    await expect(page.locator('main article')).toHaveCount(1);
    const saved = await page.evaluate(() => window.localStorage.getItem('ut.saved'));
    expect(saved).toBeTruthy();
    expect(JSON.parse(saved as string).state.entries).toHaveLength(1);
  });

  test('empty state points to the library', async ({ page }) => {
    await openWithState(page, '/saved', { saved: [] });

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(page.getByText('Nothing saved yet.')).toBeVisible();
    await page.getByRole('link', { name: 'Browse the library' }).click();
    await expect(page).toHaveURL(/\/library/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The library.');
  });

  test('a saved tale in progress shows its progress hairline', async ({ page, request }) => {
    const [entry] = await fetchSavedSeed(request, 1);
    const story = entry.story as StoryCardLike;

    await openWithState(page, '/saved', {
      saved: [entry],
      progress: {
        [story.slug]: { percent: 42, updatedAt: new Date().toISOString() },
      },
    });

    await expect(page.getByText('42% read')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue reading' })).toBeVisible();
  });
});
