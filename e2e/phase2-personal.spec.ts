import { expect, test } from '@playwright/test';

import {
  API_URL,
  apiRequest,
  awaitBootRefresh,
  getMe,
  getProgressItems,
  getSampleStories,
  getSavedItems,
  loginViaApi,
  openSignedIn,
  registerAccount,
  reloadSignedIn,
  signInBrowserContext,
  waitForSignedIn,
} from './support/accounts';

/**
 * Phase 2 personal features: account saved-list sync across devices/contexts, reading-progress
 * sync, completion stats, and reaction counts on the celebration screen.
 */
test.describe('phase 2 personal features', () => {
  test('saved tales sync across browser contexts and unsave propagates', async ({
    page,
    browser,
  }) => {
    const [story] = await getSampleStories(1);
    const account = await registerAccount({ displayName: 'Saved Sync QA', verify: true });
    const sessionA = await loginViaApi(account.email, account.password);

    await signInBrowserContext(page.context(), sessionA.refreshToken);
    const waitForBoot = await awaitBootRefresh(page);
    await page.goto(`/stories/${story.slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await waitForBoot();

    const readerBar = page.locator('main header').first();
    await readerBar.getByRole('button', { name: 'Save to your reading list' }).click();
    await expect(page.getByText('Saved to your reading list.')).toBeVisible();

    // A second device (fresh context, independent refresh family) sees the account list.
    const sessionB = await loginViaApi(account.email, account.password);
    const contextB = await browser.newContext();
    try {
      await signInBrowserContext(contextB, sessionB.refreshToken);
      const pageB = await contextB.newPage();
      await pageB.goto('/saved', { waitUntil: 'domcontentloaded' });
      await waitForSignedIn(pageB);
      await expect(pageB.getByRole('link', { name: story.title })).toBeVisible();

      await pageB.getByRole('button', { name: 'Remove from your reading list' }).first().click();
      await expect(pageB.getByText('Removed from your reading list.')).toBeVisible();
      await expect(pageB.getByRole('link', { name: story.title })).toHaveCount(0);
    } finally {
      await contextB.close();
    }

    await page.goto('/saved', { waitUntil: 'domcontentloaded' });
    await waitForSignedIn(page);
    await expect(page.getByRole('link', { name: story.title })).toHaveCount(0);
    expect((await getSavedItems(account)).total).toBe(0);
  });

  test('reading progress syncs and survives a new browser context', async ({ page, browser }) => {
    const [story] = await getSampleStories(1);
    const account = await registerAccount({ displayName: 'Progress QA', verify: true });

    await openSignedIn(page, `/stories/${story.slug}`, account);
    await page.evaluate(() => window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.55)));
    await page.waitForTimeout(800);
    // Leaving the reader through an in-app link flushes the final marker to /me/progress.
    await page.getByRole('link', { name: 'Zulu' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zulu');

    await expect
      .poll(
        async () => {
          const items = await getProgressItems(account);
          return items.find((item) => item.story.slug === story.slug)?.progress.percent ?? 0;
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(5);

    const remote = (await getProgressItems(account)).find((item) => item.story.slug === story.slug);
    expect(remote?.progress.completed).toBe(false);

    // A new device resumes the account's reading place.
    const contextB = await browser.newContext();
    try {
      const sessionB = await loginViaApi(account.email, account.password);
      await signInBrowserContext(contextB, sessionB.refreshToken);
      const pageB = await contextB.newPage();
      const waitForBootB = await awaitBootRefresh(pageB);
      await pageB.goto(`/stories/${story.slug}`, { waitUntil: 'domcontentloaded' });
      await expect(pageB.getByRole('heading', { level: 1 })).toBeVisible();
      await waitForBootB();
      await expect
        .poll(async () =>
          Number(await pageB.getByRole('progressbar').first().getAttribute('aria-valuenow')),
        )
        .toBeGreaterThan(5);
    } finally {
      await contextB.close();
    }
  });

  test('finish → complete shows account stats and reaction counts', async ({ page }) => {
    const [story] = await getSampleStories(1);
    const account = await registerAccount({ displayName: 'Complete QA', verify: true });

    await openSignedIn(page, `/stories/${story.slug}`, account);
    await page.getByRole('button', { name: 'Finish tale' }).click();
    await expect(page).toHaveURL(new RegExp(`/stories/${story.slug}/complete$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'You have finished this tale.',
    );
    await expect(page.getByText('That is 1 tale read on your account.')).toBeVisible();

    // Account reaction: optimistic selection + public count line, persisted across reload.
    const joy = page.getByRole('button', { name: /^Joy/ });
    await joy.click();
    await expect(joy).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/(One reader|\d+ readers) felt this\./)).toBeVisible();

    await reloadSignedIn(page);
    await expect(page.getByRole('button', { name: /^Joy/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Account stats: one tale read, at least one tribe explored.
    const me = await getMe(account);
    expect(me.stats.talesRead).toBe(1);
    expect(me.stats.tribesExplored).toBeGreaterThanOrEqual(1);

    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');
    const stats = page.locator('section[aria-labelledby="profile-stats"]');
    await expect(stats.getByText('Tales read')).toBeVisible();
    await expect(stats.locator('span').filter({ hasText: /^1$/ }).first()).toBeVisible();
  });

  test('reactions switch without inflating the public total', async ({ page }) => {
    const [story] = await getSampleStories(1);
    const account = await registerAccount({ displayName: 'Reactions QA', verify: true });

    const before = await apiRequest<{ total: number }>(`/stories/${story.id}/reactions/summary`);
    const initialTotal = before.body.total;

    const set = await apiRequest<{ summary: { total: number } }>(`/stories/${story.id}/reactions`, {
      method: 'PUT',
      token: account.accessToken,
      body: { type: 'JOY' },
    });
    expect(set.status).toBe(200);
    expect(set.body.summary.total).toBe(initialTotal + 1);

    const switched = await apiRequest<{
      summary: { total: number; counts: Record<string, number> };
    }>(`/stories/${story.id}/reactions`, {
      method: 'PUT',
      token: account.accessToken,
      body: { type: 'GREAT' },
    });
    expect(switched.status).toBe(200);
    expect(switched.body.summary.total).toBe(initialTotal + 1);
    expect(switched.body.summary.counts.GREAT).toBeGreaterThanOrEqual(1);
    await expect
      .poll(async () => {
        const response = await fetch(`${API_URL}/stories/${story.id}/reactions/summary`);
        const summary = (await response.json()) as { counts: Record<string, number> };
        return summary.counts.GREAT;
      })
      .toBeGreaterThanOrEqual(1);
  });
});
