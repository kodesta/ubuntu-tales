import { expect, test } from '@playwright/test';

import { getJson, openWithState } from './support/state';

interface ExploreResponse {
  points: {
    tribe: { slug: string; name: string; region: string };
    storyCount: number;
    featuredStories: { slug: string }[];
  }[];
  totalStories: number;
}

test.describe('explore atlas', () => {
  test('map pins open a publication and its tales', async ({ page, request }) => {
    const data = await getJson<ExploreResponse>(request, '/explore');
    expect(data.points.length).toBeGreaterThan(0);

    await openWithState(page, '/explore');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The world that tells these tales.');

    // One pin per publication with tales.
    const pins = page.locator('svg[role="group"] [role="button"]');
    await expect(pins).toHaveCount(data.points.length);

    // The first pin is selected by default and its panel names the publication.
    await expect(page.locator('#explore-place-name')).toHaveText(data.points[0]!.tribe.name);

    // Opening another pin switches the panel.
    await pins.nth(1).click();
    await expect(page.locator('#explore-place-name')).toHaveText(data.points[1]!.tribe.name);

    // A featured tale links into the reader.
    const storyLink = page.locator('a[href^="/stories/"]').first();
    await expect(storyLink).toBeVisible();
    await storyLink.click();
    await expect(page).toHaveURL(/\/stories\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('region filter, world view and list view work', async ({ page, request }) => {
    const data = await getJson<ExploreResponse>(request, '/explore');
    const westAfrica = data.points.filter((point) => point.tribe.region === 'WEST_AFRICA');

    await openWithState(page, '/explore');

    await page.getByRole('button', { name: /west africa/i }).first().click();
    await expect(page.locator('svg[role="group"] [role="button"]')).toHaveCount(westAfrica.length);
    await expect(page.getByText(/in West Africa/)).toBeVisible();

    await page.getByRole('button', { name: /^World$/ }).click();
    await expect(page.locator('svg[role="group"]')).toHaveAttribute('viewBox', '0 0 1000 500');

    await page.getByRole('button', { name: /list view/i }).click();
    await expect(page.locator('svg[role="group"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Places' })).toBeVisible();
  });

  test('the atlas is reachable from the app navigation', async ({ page }) => {
    await openWithState(page, '/');
    await page.getByRole('link', { name: /explore/i }).first().click();
    await expect(page).toHaveURL(/\/explore/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The world that tells these tales.');
  });
});
