import { expect, test } from '@playwright/test';

import { SAMPLE_STORY, openWithState, readStorage } from './support/state';

const BODY_SIZES = { sm: '17px', md: '19px', lg: '22px' } as const;

function bodyFontSize(page: import('@playwright/test').Page) {
  return page
    .locator('[data-sentence-id]')
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize);
}

test.describe('reader', () => {
  test('renders the editorial header, sentence-level body and reader chrome', async ({ page }) => {
    await openWithState(page, `/stories/${SAMPLE_STORY.slug}`);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(SAMPLE_STORY.title);
    await expect(page.getByText(`Narrated by`)).toBeVisible();
    await expect(page.getByRole('link', { name: SAMPLE_STORY.tribeName }).first()).toBeVisible();
    await expect(page.getByRole('img', { name: /hare beside a dark round well/i })).toBeVisible();

    // The reader owns the viewport: no global header, footer or bottom nav (design doc §6).
    await expect(page.getByRole('navigation', { name: 'Primary mobile' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);

    // Read-along-ready markup: every sentence is its own span.
    const sentenceCount = await page.locator('[data-sentence-id]').count();
    expect(sentenceCount).toBeGreaterThan(15);

    // Reader top bar controls.
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Decrease text size/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Increase text size/ })).toBeVisible();
    await expect(
      page
        .locator('main header')
        .first()
        .getByRole('button', { name: 'Save to your reading list' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share this tale' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Reading text size' })).toBeVisible();

    // Reading progress hairline is present and labelled.
    await expect(
      page.getByRole('progressbar', { name: new RegExp(SAMPLE_STORY.title) }),
    ).toBeVisible();
  });

  test('A− / A+ changes and persists the body size', async ({ page }) => {
    await openWithState(page, `/stories/${SAMPLE_STORY.slug}`, { fontSize: 'md' });

    await expect.poll(() => bodyFontSize(page)).toBe(BODY_SIZES.md);

    await page.getByRole('button', { name: /Increase text size/ }).click();
    await expect.poll(() => bodyFontSize(page)).toBe(BODY_SIZES.lg);
    await expect(page.getByRole('button', { name: /Increase text size/ })).toBeDisabled();

    // Persisted under `ut.fontSize`; a reload keeps the reader's choice.
    const stored = await readStorage<{ state: { size: string } }>(page, 'ut.fontSize');
    expect(stored?.state.size).toBe('lg');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => bodyFontSize(page)).toBe(BODY_SIZES.lg);

    await page.getByRole('button', { name: /Decrease text size/ }).click();
    await expect.poll(() => bodyFontSize(page)).toBe(BODY_SIZES.md);
    await page.getByRole('button', { name: /Decrease text size/ }).click();
    await expect.poll(() => bodyFontSize(page)).toBe(BODY_SIZES.sm);
    await expect(page.getByRole('button', { name: /Decrease text size/ })).toBeDisabled();
  });

  test('save from the reader shows the tale in /saved', async ({ page }) => {
    await openWithState(page, `/stories/${SAMPLE_STORY.slug}`);

    const readerBar = page.locator('main header').first();
    await readerBar.getByRole('button', { name: 'Save to your reading list' }).click();
    await expect(page.getByText('Saved on this device — accounts are coming soon.')).toBeVisible();
    await expect(
      readerBar.getByRole('button', { name: 'Remove from your reading list' }),
    ).toBeVisible();

    const saved = await readStorage<{ state: { entries: { story: { slug: string } }[] } }>(
      page,
      'ut.saved',
    );
    expect(saved?.state.entries.map((entry) => entry.story.slug)).toContain(SAMPLE_STORY.slug);

    await page.goto('/saved', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await expect(
      page.getByRole('article').getByRole('link', { name: SAMPLE_STORY.title }),
    ).toBeVisible();
    await expect(page.getByText('1 tale kept on this device')).toBeVisible();
  });

  test('finish tale → completion screen → reaction persists', async ({ page }) => {
    await openWithState(page, `/stories/${SAMPLE_STORY.slug}`);

    await page.getByRole('button', { name: 'Finish tale' }).click();
    await expect(page).toHaveURL(new RegExp(`/stories/${SAMPLE_STORY.slug}/complete$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'You have finished this tale.',
    );
    await expect(page.getByText('Ubuntu!')).toBeVisible();

    // Reaction picker: five emotions, local persistence under `ut.reactions`.
    const reaction = page.getByRole('button', { name: /^Joy/ });
    await expect(page.getByRole('group', { name: 'How did this tale leave you?' })).toBeVisible();
    await reaction.click();
    await expect(reaction).toHaveAttribute('aria-pressed', 'true');
    const reactions = await readStorage<{ state: { bySlug: Record<string, string> } }>(
      page,
      'ut.reactions',
    );
    expect(reactions?.state.bySlug[SAMPLE_STORY.slug]).toBe('JOY');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /^Joy/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Recommendations and ways onward.
    await expect(
      page.getByRole('heading', { name: 'Three more tales for the fire.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the reading list' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share wisdom' })).toBeVisible();

    await page.getByRole('link', { name: 'Back to the reading list' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
  });

  test('an unknown tale renders the editorial 404', async ({ page }) => {
    await openWithState(page, '/stories/a-tale-that-never-existed');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This path has grown over.');
    await expect(page.getByRole('link', { name: 'Back to the reading list' })).toBeVisible();
  });
});
