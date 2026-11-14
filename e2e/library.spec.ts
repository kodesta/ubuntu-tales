import { expect, test } from '@playwright/test';

import { getJson, openWithState } from './support/state';

interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

test.describe('library (archive)', () => {
  test('stories tab paginates by cursor via infinite scroll', async ({ page, request }) => {
    const firstPage = await getJson<Paginated<{ slug: string }>>(
      request,
      '/library/stories?limit=12',
    );
    const all = await getJson<Paginated<{ slug: string }>>(request, '/library/stories?limit=100');
    expect(firstPage.items).toHaveLength(12);
    expect(firstPage.nextCursor).toBeTruthy();

    await openWithState(page, '/library');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The library.');
    await expect(page.getByRole('tab', { name: 'All tales' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const rows = page.locator('main article');
    await expect(rows).toHaveCount(firstPage.items.length);

    // Scroll the sentinel into range; the next cursor page appends (18 seeded tales total).
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          return rows.count();
        },
        { timeout: 15_000 },
      )
      .toBe(all.items.length);
    await expect(page.getByText('You have reached the end of the archive.')).toBeVisible();
  });

  test('category filter is URL state and narrows the archive', async ({ page, request }) => {
    const animal = await getJson<Paginated<{ slug: string }>>(
      request,
      '/library/stories?category=animal&limit=100',
    );

    await openWithState(page, '/library');
    await page.getByRole('button', { name: 'Animal tales' }).click();

    await expect(page).toHaveURL(/category=animal/);
    await expect(page.getByRole('button', { name: 'Animal tales' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('main article')).toHaveCount(animal.items.length);
    await expect(page.getByText('You have reached the end of the archive.')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/category=animal/);
    await expect(page.locator('main article')).toHaveCount(animal.items.length);

    // Clear back to the full archive.
    await page.getByRole('button', { name: 'All tales' }).first().click();
    await expect(page).not.toHaveURL(/category=/);
  });

  test('audio tab shows the empty narration state', async ({ page }) => {
    await openWithState(page, '/library?tab=audio');

    await expect(page.getByRole('tab', { name: 'Audio' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The library.');
    await expect(page.getByText('Narrations are being recorded.')).toBeVisible();
    await page.getByRole('button', { name: 'Read the tales' }).click();
    await expect(page).toHaveURL(/tab=stories/);
    await expect(page.locator('main article').first()).toBeVisible();
  });

  test('voices tab lists narrators and links to griot pages', async ({ page, request }) => {
    const voices = await getJson<Paginated<{ slug: string; name: string }>>(
      request,
      '/authors?limit=100',
    );

    await openWithState(page, '/library?tab=authors');

    await expect(page.getByRole('tab', { name: 'Voices' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const voiceRows = page.locator('main a[href^="/authors/"]');
    await expect(voiceRows).toHaveCount(voices.items.length);
    await expect(page.getByText('You have met every griot in the archive.')).toBeVisible();

    await voiceRows.first().click();
    await expect(page).toHaveURL(/\/authors\/[^/]+$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('the library tabs are deep-linkable from the URL', async ({ page }) => {
    await openWithState(page, '/library?tab=authors');
    await expect(page.getByRole('tab', { name: 'Voices' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await page.getByRole('tab', { name: 'All tales' }).click();
    await expect(page).toHaveURL(/tab=stories/);
    await expect(page.getByRole('tab', { name: 'All tales' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
