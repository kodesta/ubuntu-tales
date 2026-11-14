/**
 * Idempotent catalogue seed for the Phase 1 read path.
 *
 * Reads the editorial JSON in `/content` (see content/README.md), validates every file against the
 * Zod schemas in `@ubuntu-tales/shared`, and upserts categories, tribes, narrators and stories by
 * slug. `Tribe.publishedStoryCount` is recomputed from the database after the upserts, and today's
 * `StoryOfTheDay` row is created when missing (the API has a deterministic fallback if the seed has
 * not run). Re-running the seed must produce identical row counts.
 *
 * Usage: `pnpm db:seed` (dotenv is wired to the repository-root `.env`).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  contentCategorySchema,
  contentNarratorSchema,
  contentStorySchema,
  contentTribeSchema,
  countWords,
  readTimeMinutes,
  type ContentStory,
} from '@ubuntu-tales/shared';

const EDITORIAL_TZ = process.env.EDITORIAL_TZ ?? 'Africa/Johannesburg';
const LOCALE = 'en';

/** Resolve `/content` relative to this file (packages/db/prisma → repo root) or `CONTENT_DIR`. */
function resolveContentDir(): string {
  if (process.env.CONTENT_DIR) return resolve(process.env.CONTENT_DIR);
  return resolve(__dirname, '../../../content');
}

function readJsonArray<T>(filePath: string, schema: z.ZodType<T>): T[] {
  if (!existsSync(filePath)) {
    console.warn(`[seed] ${filePath} not found — skipping.`);
    return [];
  }

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`[seed] ${filePath} is not valid JSON: ${(error as Error).message}`);
  }

  const result = z.array(schema).safeParse(raw);
  if (!result.success) {
    throw new Error(`[seed] ${filePath} failed validation:\n${result.error.toString()}`);
  }
  return result.data;
}

function readStories(storiesDir: string): ContentStory[] {
  if (!existsSync(storiesDir)) {
    console.warn(`[seed] ${storiesDir} not found — skipping stories.`);
    return [];
  }

  const files = readdirSync(storiesDir)
    .filter((file) => file.endsWith('.json'))
    .sort();

  const stories: ContentStory[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const filePath = join(storiesDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error) {
      throw new Error(`[seed] ${filePath} is not valid JSON: ${(error as Error).message}`);
    }

    const result = contentStorySchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`[seed] ${filePath} failed validation:\n${result.error.toString()}`);
    }

    if (seen.has(result.data.slug)) {
      throw new Error(`[seed] duplicate story slug "${result.data.slug}" (${filePath}).`);
    }
    seen.add(result.data.slug);
    stories.push(result.data);
  }

  return stories;
}

/**
 * Parse a content `publishedAt` into a UTC Date. Date-only values are UTC midnight; date-times
 * without an explicit offset are treated as UTC (the editorial files are written in UTC).
 */
export function parsePublishedAt(value: string): Date {
  const trimmed = value.trim();
  let iso = trimmed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    iso = `${trimmed}T00:00:00.000Z`;
  } else if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
    iso = `${trimmed}Z`;
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`[seed] publishedAt "${value}" is not a valid ISO 8601 date.`);
  }
  return date;
}

/** YYYY-MM-DD for the given instant in the editorial timezone. */
export function editorialDateKey(now: Date, timeZone = EDITORIAL_TZ): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** FNV-1a — small, stable, dependency-free hash used for the story-of-the-day fallback. */
export function hashDateKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic index in `[0, count)` (or `null` for an empty candidate list). */
export function storyOfTheDayIndex(dateKey: string, count: number): number | null {
  if (count <= 0) return null;
  return hashDateKey(dateKey) % count;
}

async function main(): Promise<void> {
  const env = process.env.NODE_ENV ?? 'development';
  if (env === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    console.warn(
      '[seed] NODE_ENV=production — the development catalogue seed is disabled. ' +
        'Set SEED_ALLOW_PRODUCTION=true to import /content into production.',
    );
    return;
  }

  const contentDir = resolveContentDir();
  console.log(`[seed] content directory: ${contentDir}`);

  const categories = readJsonArray(join(contentDir, 'categories.json'), contentCategorySchema);
  const tribes = readJsonArray(join(contentDir, 'tribes.json'), contentTribeSchema);
  const narrators = readJsonArray(join(contentDir, 'narrators.json'), contentNarratorSchema);
  const stories = readStories(join(contentDir, 'stories'));

  if (categories.length === 0 && tribes.length === 0 && stories.length === 0) {
    console.warn('[seed] No content found — nothing to seed.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const category of categories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        create: {
          slug: category.slug,
          name: category.name,
          badge: category.badge,
          sortOrder: category.sortOrder,
          isActive: true,
        },
        update: {
          name: category.name,
          badge: category.badge,
          sortOrder: category.sortOrder,
          isActive: true,
        },
      });
    }

    for (const tribe of tribes) {
      const data = {
        name: tribe.name,
        region: tribe.region,
        countries: tribe.countries,
        countriesLabel: tribe.countriesLabel,
        tagline: tribe.tagline ?? null,
        description: tribe.description ?? null,
        accentColor: tribe.accentColor,
        themeVariant: tribe.themeVariant ?? null,
        imageUrl: tribe.image?.url ?? null,
        imageAlt: tribe.image?.alt ?? null,
        imageAccent: tribe.image?.accent ?? null,
        sortOrder: tribe.sortOrder,
        subscriberCount: tribe.subscriberCount,
        isActive: true,
      };
      await prisma.tribe.upsert({
        where: { slug: tribe.slug },
        create: { slug: tribe.slug, ...data },
        update: data,
      });
    }

    for (const narrator of narrators) {
      const data = {
        name: narrator.name,
        bio: narrator.bio ?? null,
        roleLabel: narrator.roleLabel ?? null,
        accentColor: narrator.accentColor ?? null,
      };
      await prisma.narrator.upsert({
        where: { slug: narrator.slug },
        create: { slug: narrator.slug, ...data },
        update: data,
      });
    }

    const [categoryRows, tribeRows, narratorRows] = await Promise.all([
      prisma.category.findMany({ select: { id: true, slug: true } }),
      prisma.tribe.findMany({ select: { id: true, slug: true } }),
      prisma.narrator.findMany({ select: { id: true, slug: true } }),
    ]);
    const categoryIdBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));
    const tribeIdBySlug = new Map(tribeRows.map((row) => [row.slug, row.id]));
    const narratorIdBySlug = new Map(narratorRows.map((row) => [row.slug, row.id]));

    for (const story of stories) {
      const tribeId = tribeIdBySlug.get(story.tribeSlug);
      if (!tribeId) {
        throw new Error(
          `[seed] story "${story.slug}" references unknown tribe "${story.tribeSlug}".`,
        );
      }
      const categoryId = categoryIdBySlug.get(story.categorySlug);
      if (!categoryId) {
        throw new Error(
          `[seed] story "${story.slug}" references unknown category "${story.categorySlug}".`,
        );
      }

      let narratorId: string | null = null;
      if (story.narratorSlug) {
        narratorId = narratorIdBySlug.get(story.narratorSlug) ?? null;
        if (!narratorId) {
          throw new Error(
            `[seed] story "${story.slug}" references unknown narrator "${story.narratorSlug}".`,
          );
        }
      }

      const body = story.body;
      const data = {
        title: story.title,
        summary: story.summary,
        moral: story.moral ?? null,
        body,
        wordCount: countWords(body),
        readTimeMinutes: readTimeMinutes(body),
        tribeId,
        categoryId,
        narratorId,
        regionLabel: story.regionLabel ?? null,
        coverUrl: story.cover.url,
        coverAlt: story.cover.alt,
        coverAccent: story.cover.accent,
        attribution: story.attribution ?? null,
        status: 'PUBLISHED' as const,
        accessLevel: 'FREE' as const,
        isFeatured: story.isFeatured,
        publishedAt: parsePublishedAt(story.publishedAt),
        popularityScore: story.popularityScore,
        locale: LOCALE,
      };

      await prisma.story.upsert({
        where: { slug: story.slug },
        create: { slug: story.slug, ...data },
        update: data,
      });
    }

    // Recompute the denormalised published story count for every tribe (including zeroes).
    const grouped = await prisma.story.groupBy({
      by: ['tribeId'],
      where: { status: 'PUBLISHED' },
      _count: { _all: true },
    });
    const publishedCountByTribe = new Map(
      grouped.map((group) => [group.tribeId, group._count._all]),
    );
    for (const tribeRow of tribeRows) {
      await prisma.tribe.update({
        where: { id: tribeRow.id },
        data: { publishedStoryCount: publishedCountByTribe.get(tribeRow.id) ?? 0 },
      });
    }

    // Seed today's editorial pick when it has not been scheduled explicitly.
    const dateKey = editorialDateKey(new Date());
    const today = new Date(`${dateKey}T00:00:00.000Z`);
    const scheduled = await prisma.storyOfTheDay.findUnique({
      where: { date_locale: { date: today, locale: LOCALE } },
      select: { id: true },
    });

    if (!scheduled) {
      const candidates = await prisma.story.findMany({
        where: { status: 'PUBLISHED', locale: LOCALE },
        orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });
      const index = storyOfTheDayIndex(dateKey, candidates.length);
      if (index !== null) {
        const candidate = candidates[index];
        if (candidate) {
          await prisma.storyOfTheDay.create({
            data: { date: today, locale: LOCALE, storyId: candidate.id },
          });
        }
      }
    }

    const [categoryCount, tribeCount, narratorCount, storyCount, storyOfTheDayCount] =
      await Promise.all([
        prisma.category.count(),
        prisma.tribe.count(),
        prisma.narrator.count(),
        prisma.story.count(),
        prisma.storyOfTheDay.count(),
      ]);

    console.log(
      `[seed] done: categories=${categoryCount} tribes=${tribeCount} narrators=${narratorCount} ` +
        `stories=${storyCount} storyOfTheDay=${storyOfTheDayCount}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
