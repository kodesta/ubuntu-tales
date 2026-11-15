import { expect, test } from '@playwright/test';

import { openWithState } from './support/state';

/**
 * Phase 3 listening experience: the narrated tale exposes a Listen CTA, the full player renders
 * transport controls, audio actually plays and the read-along highlights a sentence.
 */
test.describe('listening (Phase 3)', () => {
  test('narrated tale offers listening and plays with read-along', async ({ page }) => {
    await openWithState(page, '/stories/when-the-chameleon-carried-the-word');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chameleon');
    await expect(page.getByRole('button', { name: /listen to this tale/i })).toBeVisible();

    await page.goto('/stories/when-the-chameleon-carried-the-word/listen', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Chameleon');
    await expect(page.getByRole('slider', { name: 'Seek narration' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Playback speed' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Follow along' })).toBeVisible();

    // Audio is served with range support, so playback should advance within a few seconds.
    const position = page.getByRole('slider', { name: 'Seek narration' });
    const before = Number(await position.getAttribute('aria-valuenow'));
    await page.waitForTimeout(3500);
    const after = Number(await position.getAttribute('aria-valuenow'));
    expect(after).toBeGreaterThan(before);

    // Read-along: the player highlights the sentence currently being narrated.
    await expect(page.locator('main [aria-current="true"]').first()).toBeVisible();
  });

  test('a tale without narration invites reading instead', async ({ page }) => {
    await openWithState(page, '/stories/the-river-that-remembers');
    await expect(page.getByRole('button', { name: /listen to this tale/i })).toHaveCount(0);

    await page.goto('/stories/the-river-that-remembers/listen', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/has not been recorded yet/i)).toBeVisible();
  });
});
