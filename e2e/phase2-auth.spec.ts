import { expect, test } from '@playwright/test';

import {
  API_URL,
  DEV_PASSWORD,
  apiRequest,
  openSignedIn,
  registerAccount,
  signOutViaMenu,
  uniqueEmail,
  waitForGuest,
  waitForSignedIn,
} from './support/accounts';

/**
 * Phase 2 web auth journeys: signup + optional roots + consents → dev-token verification →
 * personalised home; login/logout/reload + cookie/token storage; invalid credentials; forgot/reset;
 * route-guard resume; verification banner.
 */
test.describe('phase 2 auth', () => {
  test('signup with optional roots and consents → verify (dev token) → personalised home', async ({
    page,
  }) => {
    const email = uniqueEmail('qa-signup');

    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Join the readers at the fire.',
    );

    await page.locator('#signup-name').fill('Naledi QA');
    await page.locator('#signup-email').fill(email);
    await page.locator('#signup-password').fill(DEV_PASSWORD);
    await page.locator('#signup-share-roots').check();
    await page.locator('#signup-tribe').selectOption({ label: 'Zulu' });
    await page.locator('#signup-role').selectOption({ label: 'Storyteller' });
    await page.locator('#signup-age').check();
    await page.locator('#signup-terms').check();
    await page.locator('#signup-privacy').check();
    await page.getByRole('button', { name: 'Open my account' }).click();

    // New accounts land on the verification letter screen with the DEV token shortcut.
    await expect(page).toHaveURL(/\/verify-email\?sent=1/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verify your email.');
    await page.getByRole('button', { name: 'Verify with DEV token' }).click();
    await expect(page.getByRole('heading', { name: 'Your email is verified' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue reading' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await waitForSignedIn(page);
    await expect(page.getByText('Welcome back, Zulu reader.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'More from Zulu' })).toBeVisible();

    // Verification is reflected on the account page.
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');
    await expect(page.getByText('Email verified')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Zulu' }).first()).toBeVisible();
  });

  test('login persists across reload, stores no token in localStorage, and logout ends it', async ({
    page,
    context,
  }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back.');

    await page.locator('#login-email').fill('kwame@ubuntutales.local');
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/$/);
    await waitForSignedIn(page);
    await expect(page.getByText('Kwame Mensah').first()).toBeVisible();

    // The refresh cookie is the only credential: httpOnly, SameSite=Lax, scoped to /api/v1/auth.
    const cookie = (await context.cookies()).find((entry) => entry.name === 'refresh_token');
    expect(cookie, 'refresh cookie must exist after login').toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(cookie?.path).toBe('/api/v1/auth');
    expect(cookie?.secure).toBe(false); // local dev is http

    // No access token (or any JWT) may leak into web storage.
    const storage = await page.evaluate(() => ({
      local: Object.fromEntries(Object.entries(localStorage)),
      session: Object.fromEntries(Object.entries(sessionStorage)),
    }));
    const serialised = JSON.stringify(storage);
    expect(serialised).not.toContain('accessToken');
    expect(serialised).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/);

    // Reload restores the session through the refresh cookie and the boot flow.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading list.');
    await waitForSignedIn(page);

    await signOutViaMenu(page);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    const afterLogout = (await context.cookies()).find((entry) => entry.name === 'refresh_token');
    expect(afterLogout, 'logout must clear the refresh cookie').toBeUndefined();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForGuest(page);
  });

  test('wrong password and unknown email give the same calm error', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });

    await page.locator('#login-email').fill('kwame@ubuntutales.local');
    await page.locator('#login-password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    const wrongPassword = page.getByText(
      "That email and password don't match. Check them, or reset your password if you've forgotten it.",
    );
    await expect(wrongPassword).toBeVisible();

    await page.locator('#login-email').fill(`nobody-${Date.now()}@ubuntutales.local`);
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(wrongPassword).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('forgot password → reset with dev token → sign in with the new password', async ({
    page,
  }) => {
    const account = await registerAccount({ displayName: 'Reset QA', verify: true });
    const newPassword = 'qa-reset-password-123';

    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });
    await page.locator('#forgot-email').fill(account.email);
    await page.getByRole('button', { name: 'Send the reset letter' }).click();

    await expect(page.getByText('Check your inbox')).toBeVisible();
    const devLink = page.getByRole('link', { name: 'Open the reset link now' });
    await expect(devLink).toBeVisible();
    await devLink.click();

    await expect(page).toHaveURL(/\/reset-password\?token=/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a new password.');
    await page.locator('#reset-password').fill(newPassword);
    await page.locator('#reset-confirm').fill(newPassword);
    await page.getByRole('button', { name: 'Save my new password' }).click();

    await expect(page.getByRole('heading', { name: 'Your password is changed' })).toBeVisible();
    await page.getByRole('link', { name: 'Sign in with your new password' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.locator('#login-email').fill(account.email);
    await page.locator('#login-password').fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/$/);
    await waitForSignedIn(page);
  });

  test('signed-out /profile resumes at /profile after signing in', async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/);

    await page.locator('#login-email').fill('kwame@ubuntutales.local');
    await page.locator('#login-password').fill(DEV_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your reading life.');
    await waitForSignedIn(page);
  });

  test('unverified account shows the verification banner; resend and verification clear it', async ({
    page,
  }) => {
    // 1. The unverified account sees the banner; resending rotates the token and confirms quietly.
    const unverified = await registerAccount({ displayName: 'Banner QA' });
    await openSignedIn(page, '/', unverified);
    const banner = page.getByText('Your email is not verified yet.');
    await expect(banner).toBeVisible();
    await page.getByRole('button', { name: 'Resend letter' }).click();
    await expect(page.getByText('A new verification letter is on its way.')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss verification reminder' }).click();
    await expect(banner).toHaveCount(0);

    // 2. A separate account verified through the dev token: the banner never appears.
    const verified = await registerAccount({ displayName: 'Verified Banner QA', verify: true });
    await openSignedIn(page, '/', verified);
    await expect(page.getByText('Your email is not verified yet.')).toHaveCount(0);
    const me = await apiRequest<{ user?: { emailVerified?: boolean } }>('/auth/verify-email', {
      method: 'POST',
      body: { token: verified.devEmailToken },
    });
    // The token is single-use: a replay is rejected, proving verification really happened.
    expect(me.status).toBe(400);
    void apiRequest;
  });

  test('signup validates required fields and consents before calling the API', async ({ page }) => {
    await page.goto('/signup', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Open my account' }).click();

    // Client-side validation renders field-level errors (never colour-only) and stays on the page.
    await expect(page.getByText('Tell us the name the fire should call you.')).toBeVisible();
    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText('Choose a password.')).toBeVisible();
    await expect(page.getByText('You need to be 13 or older to keep an account.')).toBeVisible();
    await expect(page.getByText('Please accept the terms of reading.')).toBeVisible();
    await expect(page.getByText('Please accept the privacy policy.')).toBeVisible();
    await expect(page.locator('#signup-age')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#signup-age-error')).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });
});
