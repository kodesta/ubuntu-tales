import { expect, test } from '@playwright/test';

import { openWithState, readStorage } from './support/state';

test.describe('publications index and publication page', () => {
  test('/tribes lists all 16 publications with working search and region filters', async ({
    page,
  }) => {
    await openWithState(page, '/tribes');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Choose the voices you want to hear.',
    );
    await expect(page.getByText('16 publications')).toBeVisible();
    await expect(page.getByRole('button', { name: 'All regions' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Region filter (local UI state, not URL) narrows the grid to the four East African voices.
    await page.getByRole('button', { name: 'East Africa' }).click();
    await expect(page.getByText('4 publications')).toBeVisible();
    await expect(page.getByRole('link', { name: /Maasai/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Zulu/ })).toHaveCount(0);

    // Publication search.
    await page.getByRole('button', { name: 'All regions' }).click();
    await page.getByRole('searchbox', { name: 'Search publications' }).fill('zulu');
    await expect(page.getByText('1 publication', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Zulu/ })).toBeVisible();

    // Empty search has an explicit escape hatch.
    await page.getByRole('searchbox', { name: 'Search publications' }).fill('zzzzzz');
    await expect(page.getByText('That search came back quiet.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByText('16 publications')).toBeVisible();
  });

  test('publication page shows masthead, archive and a working subscribe', async ({ page }) => {
    await openWithState(page, '/tribes/zulu');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zulu');
    await expect(page.getByText('Voices from the eastern grasslands.')).toBeVisible();
    await expect(page.getByText('2 tales · 12.4k readers · South Africa')).toBeVisible();

    // Latest tales — numbered editorial archive with both seeded Zulu tales.
    const latest = page.locator('section[aria-labelledby="latest-tales-title"]');
    await expect(latest.getByRole('heading', { name: 'Latest tales' })).toBeVisible();
    await expect(latest.locator('ol > li')).toHaveCount(2);
    await expect(latest.getByText('01', { exact: true })).toBeVisible();
    await expect(latest.getByText('02', { exact: true })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'From the archive' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'About this publication' })).toBeVisible();
    await expect(
      page.getByText(
        'This is a community publication. Tales are traditional and retold with care.',
      ),
    ).toBeVisible();

    // Subscribe is local-only but must flip state and persist to `ut.follows`.
    const subscribe = page.getByRole('button', { name: /^Subscribe Zulu$/ });
    await expect(subscribe).toContainText('Subscribe');
    await subscribe.click();
    await expect(page.getByText('Subscribed ✓')).toBeVisible();
    const follows = await readStorage<{ state: { slugs: string[] } }>(page, 'ut.follows');
    expect(follows?.state.slugs).toContain('zulu');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Subscribed ✓')).toBeVisible();
  });

  test('an unknown publication renders the editorial 404', async ({ page }) => {
    await openWithState(page, '/tribes/not-a-publication');
    await expect(page).toHaveURL(/\/tribes\/not-a-publication$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This path has grown over.');
    await expect(page.getByText('The tale may have moved.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse the library' })).toBeVisible();
  });
});
