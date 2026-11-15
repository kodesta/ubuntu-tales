import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 1 end-to-end suite for Ubuntu Tales.
 *
 * The suite runs against the real stack (Vite web on :5173 proxying the NestJS API on :4100,
 * seeded Postgres). It does not start servers: see `e2e/README.md` for the exact commands.
 *
 * Browsers live in the workspace (`PLAYWRIGHT_BROWSERS_PATH=.playwright-browsers`), and this
 * config defaults that variable so `pnpm exec playwright test` works from the repo root.
 */
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve(process.cwd(), '.playwright-browsers');

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  // The catalogue is small and the journeys share one API/database: a single worker keeps runs
  // deterministic and screenshots stable.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: WEB_URL,
    // Vite keeps an HMR websocket and TanStack Query keeps prefetching, so `networkidle` is not a
    // reliable signal here. Journeys wait for real content instead.
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'en-GB',
    timezoneId: 'Africa/Johannesburg',
    colorScheme: 'light',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      },
    },
  ],
  outputDir: 'test-results/artifacts',
});
