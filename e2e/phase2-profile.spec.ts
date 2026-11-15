import { expect, test } from '@playwright/test';

import {
  DEV_PASSWORD,
  apiRequest,
  getMe,
  loginViaApi,
  openAccountMenu,
  openSignedIn,
  registerAccount,
  reloadSignedIn,
  signInBrowserContext,
  waitForGuest,
  waitForSignedIn,
} from './support/accounts';

/**
 * Phase 2 profile + settings: edit name/roots/role; change password (this device stays signed in,
 * other sessions are revoked) and sign out everywhere.
 */
test.describe('phase 2 profile and settings', () => {
  test('profile edit updates name, roots and community role', async ({ page }) => {
    const account = await registerAccount({ displayName: 'Profile QA', verify: true });
    await openSignedIn(page, '/profile', account);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');

    await page.locator('#profile-name').fill('Naledi Mokoena');
    await page.locator('#profile-tribe').selectOption({ label: 'Maasai' });
    await page.locator('#profile-role').selectOption({ label: 'Seeker' });
    await page.getByRole('button', { name: 'Save details' }).click();

    await expect(page.getByText('Your details are saved.')).toBeVisible();
    // Desktop shows the name in the header trigger; mobile abbreviates it, so assert via the menu.
    await openAccountMenu(page);
    await expect(page.locator('#account-menu-panel')).toContainText('Naledi Mokoena');
    await page.keyboard.press('Escape');

    await reloadSignedIn(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');
    await expect(page.getByText('Welcome, Naledi.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Maasai' }).first()).toBeVisible();
    await expect(page.getByText('Seeker').first()).toBeVisible();

    const me = await getMe(account);
    expect(me.displayName).toBe('Naledi Mokoena');
    expect((me as unknown as { tribe?: { slug: string } }).tribe?.slug).toBe('maasai');
    expect((me as unknown as { communityRole?: string }).communityRole).toBe('SEEKER');
  });

  test('change password keeps this device signed in and revokes other sessions', async ({
    page,
    browser,
  }) => {
    const account = await registerAccount({ displayName: 'Password QA', verify: true });
    const newPassword = 'qa-changed-password-123';
    const sessionA = await loginViaApi(account.email, account.password);
    const sessionB = await loginViaApi(account.email, account.password);

    await signInBrowserContext(page.context(), sessionA.refreshToken);
    await page.goto('/settings', { waitUntil: 'domcontentloaded' });
    await waitForSignedIn(page);
    await page.locator('#settings-current-password').fill(account.password);
    await page.locator('#settings-new-password').fill(newPassword);
    await page.locator('#settings-confirm-password').fill(newPassword);
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Your password is changed.')).toBeVisible();

    // The current device keeps a fresh refresh cookie …
    await reloadSignedIn(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Your account, in your hands.',
    );

    // … while the other device's session family is revoked on its next refresh.
    const contextB = await browser.newContext();
    try {
      await signInBrowserContext(contextB, sessionB.refreshToken);
      const pageB = await contextB.newPage();
      await pageB.goto('/', { waitUntil: 'domcontentloaded' });
      await waitForGuest(pageB);
    } finally {
      await contextB.close();
    }

    // Old password no longer works; the new one does.
    const oldLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: account.email, password: account.password },
    });
    expect(oldLogin.status).toBe(401);
    const newLogin = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: account.email, password: newPassword },
    });
    expect(newLogin.status).toBe(200);

    // Sign out everywhere ends this device's session too.
    await page.getByRole('button', { name: 'Sign out everywhere' }).click();
    await expect(page.getByText('Signed out on every device.')).toBeVisible();
    await waitForGuest(page);
    const boot = await page.context().cookies();
    expect(boot.find((cookie) => cookie.name === 'refresh_token')).toBeUndefined();
  });

  test('password change rejects a wrong current password with a field error', async ({ page }) => {
    const account = await registerAccount({ displayName: 'Password Guard QA', verify: true });
    await openSignedIn(page, '/settings', account);

    await page.locator('#settings-current-password').fill('not-the-current-password');
    await page.locator('#settings-new-password').fill('another-password-123');
    await page.locator('#settings-confirm-password').fill('another-password-123');
    await page.getByRole('button', { name: 'Change password' }).click();

    await expect(page.getByText('Your current password is incorrect.')).toBeVisible();
    await expect(page.locator('#settings-current-password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });
});
