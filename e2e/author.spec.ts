import { expect, test } from '@playwright/test';

import { getJson, openWithState } from './support/state';

interface AuthorSummary {
  slug: string;
  name: string;
  roleLabel?: string;
  publishedStoryCount: number;
}

interface AuthorDetail extends AuthorSummary {
  bio?: string;
  stories: { title: string }[];
}

interface Paginated<T> {
  items: T[];
}

test.describe('griot (author) page', () => {
  test('profile renders identity, tales and affiliations', async ({ page, request }) => {
    const voices = await getJson<Paginated<AuthorSummary>>(request, '/authors?limit=1');
    const author = voices.items[0];
    expect(author).toBeTruthy();

    const detail = await getJson<AuthorDetail>(request, `/authors/${author.slug}`);
    expect(detail.stories.length).toBeGreaterThan(0);

    await openWithState(page, `/authors/${author.slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(author.name);
    await expect(page.getByRole('heading', { name: `Tales told by ${author.name}.` })).toBeVisible();
    await expect(page.getByText('The griots')).toBeVisible();
    const rows = page.locator('main section[aria-labelledby="griot-tales"] article');
    await expect(rows).toHaveCount(detail.stories.length);
    await expect(
      page.locator('aside[aria-labelledby="griot-publications"]').getByRole('heading', { name: 'Publications' }),
    ).toBeVisible();
    await expect(page.getByText('Follows are kept on this device until accounts arrive.')).toBeVisible();

    // Follow the voice locally (aria-label carries the griot's name).
    const follow = page.getByRole('button', { name: `Follow ${author.name}` });
    await follow.click();
    await expect(page.getByText('Following this voice ✓')).toBeVisible();

    // Publication affiliation links back to a publication page.
    const publicationLink = page.locator('aside a[href^="/tribes/"]').first();
    if ((await publicationLink.count()) > 0) {
      await publicationLink.click();
      await expect(page).toHaveURL(/\/tribes\/[^/]+$/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });

  test('unknown griot renders the editorial 404', async ({ page }) => {
    await openWithState(page, '/authors/a-griot-who-never-told');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This path has grown over.');
  });
});
