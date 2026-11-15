import { expect, test } from '@playwright/test';

import {
  DEV_PASSWORD,
  awaitBootRefresh,
  getSampleStories,
  registerAccount,
  waitForSignedIn,
} from './support/accounts';
import { openWithState, readStorage } from './support/state';

/**
 * Guest → account merge through the reachable AuthModal: a guest with roots, a saved tale and a
 * reading position opens `/saved`, uses the "Sign in to keep this list on every device" gate,
 * signs in, and the modal closes back on `/saved` with the data now on the account.
 */
test.describe('phase 2 guest merge via AuthModal', () => {
  test('guest roots, saved tale and reading place merge into a new account', async ({ page }) => {
    const [story] = await getSampleStories(1);
    const account = await registerAccount({ displayName: 'Merge QA' });
    const savedAt = new Date(Date.now() - 120_000).toISOString();
    const updatedAt = new Date(Date.now() - 60_000).toISOString();

    await openWithState(page, '/saved', {
      onboarded: true,
      tribe: { slug: 'zulu', name: 'Zulu' },
      saved: [{ story, savedAt }],
      progress: {
        [story.slug]: { percent: 40, lastSentenceId: 's_0005', updatedAt },
      },
    });

    // Guest list is on-device, with the account gate wired to the AuthModal.
    await expect(page.getByText('Saved on this device')).toBeVisible();
    const cta = page.getByRole('button', { name: 'Sign in to keep this list on every device' });
    await expect(cta).toBeVisible();
    await cta.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Welcome back.')).toBeVisible();
    await dialog.locator('#login-email').fill(account.email);
    await dialog.locator('#login-password').fill(DEV_PASSWORD);
    await dialog.getByRole('button', { name: 'Sign in' }).click();

    // The modal closes and the original destination is resumed, now signed in.
    await expect(dialog).toBeHidden({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/saved/);
    await waitForSignedIn(page);
    await expect(page.getByText('On your account', { exact: true })).toBeVisible();
    await expect(page.getByText(/saved on your account/)).toBeVisible();
    await expect(page.getByRole('link', { name: story.title })).toBeVisible();

    // Only guest-only state is cleared; the saved store now mirrors the account list.
    const tribe = await readStorage<{ state: { slug: string | null } }>(page, 'ut.tribe');
    expect(tribe?.state.slug ?? null).toBeNull();
    const progress = await readStorage<{ state: { bySlug: Record<string, unknown> } }>(
      page,
      'ut.progress',
    );
    expect(Object.keys(progress?.state.bySlug ?? {})).toHaveLength(0);
    const saved = await readStorage<{ state: { entries: Array<{ story: { slug: string } }> } }>(
      page,
      'ut.saved',
    );
    expect(saved?.state.entries.map((entry) => entry.story.slug)).toContain(story.slug);

    // Roots moved to the account and are visible on the profile.
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');
    await expect(page.locator('main').getByText('Zulu').first()).toBeVisible();

    // Reading place moved too: the reader resumes from the merged progress.
    const waitForBoot = await awaitBootRefresh(page);
    await page.goto(`/stories/${story.slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await waitForBoot();
    await expect
      .poll(async () =>
        Number(await page.getByRole('progressbar').first().getAttribute('aria-valuenow')),
      )
      .toBeGreaterThan(20);
  });
});
