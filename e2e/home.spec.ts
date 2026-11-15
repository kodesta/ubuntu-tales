import { expect, test } from '@playwright/test';

import { getJson, openWithState } from './support/state';

interface StoryItem {
  slug: string;
  title: string;
}

interface StoryListResponse {
  items: StoryItem[];
}

test.describe('home feed and URL-driven discovery', () => {
  test('home renders today’s tale and the publications feed', async ({ page, request }) => {
    const home = await getJson<{ storyOfTheDay: StoryItem }>(request, '/home');
    const stories = await getJson<StoryListResponse>(request, '/stories?limit=12');

    await openWithState(page, '/', {
      tribe: { slug: 'zulu', name: 'Zulu' },
      follows: ['zulu'],
    });

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(page.getByText('Today’s tale')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: home.storyOfTheDay.title, level: 2 }),
    ).toBeVisible();
    await expect(page.getByText('Welcome back, Zulu reader.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'More from Zulu' })).toBeVisible();

    const feed = page.locator('section').filter({ hasText: 'From your publications' });
    await expect(feed.getByRole('heading', { name: 'From your publications' })).toBeVisible();
    // The feed renders real seed stories (Zulu tales when the reader follows Zulu).
    expect(stories.items.length).toBeGreaterThan(0);
    await expect(feed.locator('article').first()).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Wisdom notes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discover publications' })).toBeVisible();
  });

  test('search keeps the query in the URL and survives a reload', async ({ page }) => {
    await openWithState(page, '/?q=lion');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(page.getByRole('heading', { name: /Results for “lion”/ })).toBeVisible();
    const firstResult = page
      .locator('section[aria-labelledby="search-results-title"] article')
      .first();
    await expect(firstResult).toBeVisible();
    expect(
      await page.locator('section[aria-labelledby="search-results-title"] article').count(),
    ).toBeGreaterThan(0);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/q=lion/);
    await expect(page.getByRole('heading', { name: /Results for “lion”/ })).toBeVisible();

    // Clearing the search returns the editorial feed (and clears the URL state).
    await page.getByRole('button', { name: 'Clear search' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Today’s tale')).toBeVisible();
  });

  test('category filter is URL state and stays in sync with the pills', async ({ page }) => {
    await openWithState(page, '/?category=creation');

    await expect(page.getByRole('heading', { name: 'Tales by category' })).toBeVisible();
    const creationPill = page.getByRole('button', { name: 'Creation myths' });
    await expect(creationPill).toHaveAttribute('aria-pressed', 'true');
    const creationRows = page.locator('section[aria-labelledby="search-results-title"] article');
    await expect(creationRows.first()).toBeVisible();
    expect(await creationRows.count()).toBe(4);

    await page.getByRole('button', { name: 'Animal tales' }).click();
    await expect(page).toHaveURL(/category=animal/);
    await expect(page.getByRole('button', { name: 'Animal tales' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(await creationRows.count()).toBe(3);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/category=animal/);
    await expect(page.getByRole('button', { name: 'Animal tales' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('the search overlay writes ?q= and opens a suggestion', async ({ page }) => {
    await openWithState(page, '/');
    await page.getByRole('button', { name: 'Search tales' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Search the archive')).toBeVisible();
    const input = dialog.getByRole('searchbox', { name: 'Search tales and publications' });
    await input.fill('anansi');

    const suggestion = dialog.getByRole('button', { name: /Anansi and the Pot of Wisdom/ });
    await expect(suggestion).toBeVisible();
    await suggestion.click();

    await expect(page).toHaveURL(/\/stories\/anansi-and-the-pot-of-wisdom$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Anansi and the Pot of Wisdom',
    );
  });
});
