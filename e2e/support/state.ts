import { expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * Local state (the Phase 1 catalogue is read-only; everything personal lives in `localStorage`).
 * Each test gets a fresh browser context, so we seed exactly the keys a journey needs and never
 * rely on a previous test's leftovers.
 */
export const API_URL = process.env.API_URL ?? 'http://localhost:4100/api/v1';

/** A real seeded tale, used by the reader / complete journeys. */
export const SAMPLE_STORY = {
  slug: 'unogwaja-and-the-lions-well',
  title: 'uNogwaja and the Lion’s Well',
  tribeSlug: 'zulu',
  tribeName: 'Zulu',
} as const;

/** Shona only has one published tale, so choosing it triggers the low-story dialog. */
export const LOW_STORY_TRIBE = { slug: 'shona', name: 'Shona' } as const;

export interface SavedSeedEntry {
  story: unknown;
  savedAt: string;
}

export interface SeedState {
  /** Defaults to true — pass `false` to simulate a first visit. */
  onboarded?: boolean;
  tribe?: { slug: string; name: string } | null;
  follows?: string[];
  saved?: SavedSeedEntry[];
  reactions?: Record<string, string>;
  fontSize?: 'sm' | 'md' | 'lg';
  progress?: Record<string, { percent: number; updatedAt: string; lastSentenceId?: string }>;
}

interface Persisted {
  state: Record<string, unknown>;
  version: number;
}

function persisted(state: Record<string, unknown>): Persisted {
  return { state, version: 0 };
}

export function buildSeedEntries(seed: SeedState): Record<string, Persisted> {
  const entries: Record<string, Persisted> = {
    'ut.onboarded': persisted({ onboarded: seed.onboarded ?? true }),
  };

  if (seed.tribe !== undefined) {
    entries['ut.tribe'] = persisted({
      slug: seed.tribe?.slug ?? null,
      name: seed.tribe?.name ?? null,
    });
  }
  if (seed.follows !== undefined) entries['ut.follows'] = persisted({ slugs: seed.follows });
  if (seed.saved !== undefined) entries['ut.saved'] = persisted({ entries: seed.saved });
  if (seed.reactions !== undefined) entries['ut.reactions'] = persisted({ bySlug: seed.reactions });
  if (seed.fontSize !== undefined) entries['ut.fontSize'] = persisted({ size: seed.fontSize });
  if (seed.progress !== undefined) entries['ut.progress'] = persisted({ bySlug: seed.progress });

  return entries;
}

/**
 * Seeds `localStorage` for the current origin. Playwright gives every test a clean context, so the
 * first navigation exists only to give us the origin; the app may briefly render `/welcome`, which
 * is harmless.
 */
export async function seedLocalStorage(page: Page, seed: SeedState = {}): Promise<void> {
  const entries = buildSeedEntries(seed);
  await page.goto('/welcome', { waitUntil: 'domcontentloaded' });
  await page.evaluate((payload) => {
    window.localStorage.clear();
    for (const [key, value] of Object.entries(payload)) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }, entries);
}

/** Seeds local state, opens `path` and waits for the page's editorial h1. */
export async function openWithState(page: Page, path: string, seed: SeedState = {}): Promise<void> {
  await seedLocalStorage(page, seed);
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await waitForApp(page);
}

/** Every route in the app renders exactly one editorial `h1`; it is the cheapest "app is up" signal. */
export async function waitForApp(page: Page): Promise<void> {
  await expect(page.locator('main h1').first()).toBeVisible();
}

export async function getJson<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`${API_URL}${path}`);
  expect(response.ok(), `GET ${path} should succeed (got ${response.status()})`).toBeTruthy();
  return (await response.json()) as T;
}

export async function readStorage<T = unknown>(page: Page, key: string): Promise<T | null> {
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as unknown) : null;
  }, key) as Promise<T | null>;
}

export interface StoryCardLike {
  id: string;
  slug: string;
  title: string;
  [key: string]: unknown;
}

/** Builds `/saved` seed rows from real API story cards so row covers/links are genuine. */
export async function fetchSavedSeed(
  request: APIRequestContext,
  count = 2,
): Promise<SavedSeedEntry[]> {
  const payload = await getJson<{ items: StoryCardLike[] }>(request, `/stories?limit=${count}`);
  return payload.items.slice(0, count).map((story, index) => ({
    story,
    savedAt: new Date(Date.now() - index * 60_000).toISOString(),
  }));
}
