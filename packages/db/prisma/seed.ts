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
import fs, { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path, { join, resolve } from 'node:path';
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

interface GeoEntry {
  lat: number;
  lng: number;
  place?: string;
}

/** Curated coordinates for the /explore map (content/geo.json). */
function readGeo(contentDir: string): Record<string, GeoEntry> {
  const file = path.join(contentDir, 'geo.json');
  if (!fs.existsSync(file)) return {};
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  const out: Record<string, GeoEntry> = {};
  for (const [slug, value] of Object.entries(parsed)) {
    if (slug.startsWith('_') || !value || typeof value !== 'object') continue;
    const entry = value as GeoEntry;
    if (typeof entry.lat === 'number' && typeof entry.lng === 'number') out[slug] = entry;
  }
  return out;
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

// ───────────── Phase 2 dev users (never seeded in production) ─────────────

/** Current policy version recorded on the `UserConsent` rows created at signup/seed time. */
const CONSENT_VERSION = '2026-11-01';

interface DevUser {
  email: string;
  displayName: string;
  systemRole: 'READER' | 'CONTRIBUTOR' | 'EDITOR' | 'ADMIN';
  tribeSlug?: string;
  communityRole?:
    | 'STORYTELLER'
    | 'SEEKER'
    | 'WRITER'
    | 'STORYTELLER_AND_SEEKER'
    | 'ELDER_GUARDIAN';
  lineageLabel?: string;
}

/**
 * Seeded demo users from production plan 02 §6: admin + editor for role testing, and the four
 * concept demo readers with their roots. Everyone shares `SEED_DEV_PASSWORD` so local/e2e runs are
 * reproducible (the QA suite logs in with these accounts).
 */
const DEV_USERS: DevUser[] = [
  {
    email: 'admin@ubuntutales.local',
    displayName: 'Ubuntu Tales Admin',
    systemRole: 'ADMIN',
  },
  {
    email: 'editor@ubuntutales.local',
    displayName: 'Ubuntu Tales Editor',
    systemRole: 'EDITOR',
  },
  {
    email: 'kwame@ubuntutales.local',
    displayName: 'Kwame Mensah',
    systemRole: 'READER',
    tribeSlug: 'ashanti',
    communityRole: 'STORYTELLER',
    lineageLabel: 'Ashanti Lineage',
  },
  {
    email: 'thandiwe@ubuntutales.local',
    displayName: 'Thandiwe Nkosi',
    systemRole: 'READER',
    tribeSlug: 'zulu',
    communityRole: 'SEEKER',
    lineageLabel: 'Zulu Lineage',
  },
  {
    email: 'tendai@ubuntutales.local',
    displayName: 'Tendai Moyo',
    systemRole: 'READER',
    tribeSlug: 'shona',
    communityRole: 'WRITER',
    lineageLabel: 'Shona Lineage',
  },
  {
    email: 'amina@ubuntutales.local',
    displayName: 'Amina Diallo',
    systemRole: 'READER',
    tribeSlug: 'hausa',
    communityRole: 'STORYTELLER_AND_SEEKER',
    lineageLabel: 'Hausa Lineage',
  },
];

/** The subset of `@node-rs/argon2` the seed needs (typed locally — the dep lives in apps/api). */
interface Argon2Like {
  hash(
    password: string,
    options?: {
      memoryCost?: number;
      timeCost?: number;
      parallelism?: number;
      algorithm?: number;
    },
  ): Promise<string>;
  verify(hashed: string, password: string): Promise<boolean>;
}

/**
 * Load `@node-rs/argon2` from `apps/api` (the package that owns the dependency) so seeded password
 * hashes are bit-identical to what the auth module produces. `packages/db` deliberately does not
 * re-declare the dependency, so a bare import would not resolve under pnpm's strict linker.
 */
function loadArgon2(): Argon2Like {
  const apiRequire = createRequire(resolve(__dirname, '../../../apps/api/package.json'));
  return apiRequire('@node-rs/argon2') as Argon2Like;
}

/**
 * Idempotently upsert the dev users, their consents and their stats rows. Passwords are only
 * re-hashed when the stored hash no longer matches `SEED_DEV_PASSWORD`; re-running the seed keeps
 * row counts stable and does not invalidate existing sessions.
 */
async function seedDevUsers(prisma: PrismaClient): Promise<number> {
  const password = process.env.SEED_DEV_PASSWORD ?? 'ubuntu-tales-dev';
  if (!process.env.SEED_DEV_PASSWORD) {
    console.warn('[seed] SEED_DEV_PASSWORD is not set — using the development default password.');
  }

  const argon2 = loadArgon2();
  const passwordHash = await argon2.hash(password, {
    algorithm: 2, // Argon2id
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const tribeRows = await prisma.tribe.findMany({ select: { id: true, slug: true } });
  const tribeIdBySlug = new Map(tribeRows.map((row) => [row.slug, row.id]));
  const verifiedAt = new Date();

  for (const user of DEV_USERS) {
    const tribeId = user.tribeSlug ? tribeIdBySlug.get(user.tribeSlug) : null;
    if (user.tribeSlug && !tribeId) {
      throw new Error(
        `[seed] dev user "${user.email}" references unknown tribe "${user.tribeSlug}".`,
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true, passwordHash: true },
    });
    const existingHashMatches = existing?.passwordHash
      ? await argon2.verify(existing.passwordHash, password)
      : false;
    const hash = existingHashMatches ? (existing?.passwordHash ?? passwordHash) : passwordHash;

    const data = {
      displayName: user.displayName,
      passwordHash: hash,
      emailVerifiedAt: verifiedAt,
      onboardedAt: verifiedAt,
      tribeId: tribeId ?? null,
      communityRole: user.communityRole ?? null,
      lineageLabel: user.lineageLabel ?? null,
      systemRole: user.systemRole,
      status: 'ACTIVE' as const,
      locale: 'en',
    };

    const row = await prisma.user.upsert({
      where: { email: user.email },
      create: { email: user.email, ...data },
      update: data,
      select: { id: true },
    });

    await prisma.userStats.upsert({
      where: { userId: row.id },
      create: { userId: row.id },
      update: {},
    });

    const consentTypes = [
      'terms',
      'privacy',
      ...(tribeId || user.lineageLabel ? ['lineage_personalisation'] : []),
    ];
    const existingConsents = await prisma.userConsent.findMany({
      where: { userId: row.id },
      select: { type: true },
    });
    const missing = consentTypes.filter(
      (type) => !existingConsents.some((consent) => consent.type === type),
    );
    if (missing.length > 0) {
      await prisma.userConsent.createMany({
        data: missing.map((type) => ({
          userId: row.id,
          type,
          version: CONSENT_VERSION,
          granted: true,
        })),
      });
    }
  }

  return DEV_USERS.length;
}


interface NarrationManifest {
  narrations: {
    storySlug: string;
    narratorSlug: string;
    locale: string;
    durationMs: number;
    timingStatus: 'NONE' | 'AUTO' | 'VERIFIED';
    timings: { sentenceId: string; startMs: number; endMs: number }[];
    renditions: { aac_64k: string; aac_128k: string };
  }[];
  soundscapes: { slug: string; name: string; url: string; defaultGain: number }[];
}

/** Demo narration audio generated by `tools/generate-narrations.mjs` (Piper TTS). */
function readNarrationManifest(repoRoot: string): NarrationManifest | null {
  const file = path.join(repoRoot, 'var/media/narrations/manifest.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8')) as NarrationManifest;
}

/**
 * Seeds narration + soundscape rows from the generated manifest. Idempotent: narrations are matched
 * by (story, locale) and reused, renditions by (asset, name). Real recordings replace these in 6.2.
 */
async function seedNarrations(prisma: PrismaClient, repoRoot: string): Promise<number> {
  const manifest = readNarrationManifest(repoRoot);
  if (!manifest || manifest.narrations.length === 0) {
    console.log('[seed] no narration manifest found — skipping audio seed');
    return 0;
  }

  const soundscapeIds = new Map<string, string>();
  for (const soundscape of manifest.soundscapes) {
    const row = await prisma.soundscape.upsert({
      where: { slug: soundscape.slug },
      create: {
        slug: soundscape.slug,
        name: soundscape.name,
        audioUrl: soundscape.url,
        defaultGain: soundscape.defaultGain,
      },
      update: {
        name: soundscape.name,
        audioUrl: soundscape.url,
        defaultGain: soundscape.defaultGain,
      },
    });
    soundscapeIds.set(soundscape.slug, row.id);
  }

  let seeded = 0;
  const defaultSoundscape = soundscapeIds.get('savanna-night') ?? manifest.soundscapes[0]?.slug;

  for (const entry of manifest.narrations) {
    const story = await prisma.story.findUnique({ where: { slug: entry.storySlug } });
    if (!story) continue;

    const narrator = await prisma.narrator.findUnique({ where: { slug: entry.narratorSlug } });
    if (!narrator) {
      console.warn(`[seed] narration for ${entry.storySlug}: narrator ${entry.narratorSlug} missing`);
      continue;
    }

    // One READY audio asset per story narration, with its two renditions.
    const existingAsset = await prisma.mediaAsset.findFirst({
      where: {
        purpose: 'NARRATION_AUDIO',
        storageKey: `narrations/${entry.storySlug}`,
      },
      include: { renditions: true },
    });

    const asset = existingAsset
      ? await prisma.mediaAsset.update({
          where: { id: existingAsset.id },
          data: { status: 'READY', durationMs: entry.durationMs, failureReason: null },
        })
      : await prisma.mediaAsset.create({
          data: {
            kind: 'AUDIO',
            purpose: 'NARRATION_AUDIO',
            status: 'READY',
            storageKey: `narrations/${entry.storySlug}`,
            originalName: `${entry.storySlug}.m4a`,
            contentType: 'audio/mp4',
            sizeBytes: 0,
            durationMs: entry.durationMs,
          },
        });

    for (const [name, url] of Object.entries(entry.renditions)) {
      await prisma.mediaRendition.upsert({
        where: { assetId_name: { assetId: asset.id, name } },
        create: {
          assetId: asset.id,
          name,
          url,
          mimeType: 'audio/mp4',
          sizeBytes: 0,
          durationMs: entry.durationMs,
        },
        update: { url, durationMs: entry.durationMs },
      });
    }

    const existingNarration = await prisma.narration.findFirst({
      where: { storyId: story.id, locale: entry.locale },
    });

    const data = {
      storyId: story.id,
      narratorId: narrator.id,
      locale: entry.locale,
      audioAssetId: asset.id,
      durationMs: entry.durationMs,
      sentenceTimings: entry.timings,
      timingStatus: entry.timingStatus,
      soundscapeId: defaultSoundscape ? (soundscapeIds.get(defaultSoundscape) ?? null) : null,
      isDefault: true,
      isPublished: true,
    };

    if (existingNarration) {
      await prisma.narration.update({ where: { id: existingNarration.id }, data });
    } else {
      await prisma.narration.create({ data });
    }
    // Exactly one default per story+locale.
    const written = await prisma.narration.findFirst({
      where: { storyId: story.id, locale: entry.locale, isDefault: true },
      select: { id: true },
    });
    if (written) {
      await prisma.narration.updateMany({
        where: { storyId: story.id, locale: entry.locale, id: { not: written.id } },
        data: { isDefault: false },
      });
    }
    seeded += 1;
  }

  return seeded;
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
  const geo = readGeo(contentDir);

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
        ...(geo[tribe.slug]
          ? {
              latitude: geo[tribe.slug]!.lat,
              longitude: geo[tribe.slug]!.lng,
              mapPlaceLabel: geo[tribe.slug]!.place ?? null,
            }
          : {}),
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

    // Phase 2: dev/staging user accounts (never in production, even with SEED_ALLOW_PRODUCTION).
    const devUserCount = env !== 'production' ? await seedDevUsers(prisma) : 0;

    // Phase 3: demo narrations + soundscapes (skipped when no manifest has been generated).
    const narrationCount = await seedNarrations(prisma, path.resolve(contentDir, '..'));

    const [
      categoryCount,
      tribeCount,
      narratorCount,
      storyCount,
      storyOfTheDayCount,
      userCount,
      narrationTotal,
      soundscapeCount,
    ] = await Promise.all([
        prisma.category.count(),
        prisma.tribe.count(),
        prisma.narrator.count(),
        prisma.story.count(),
        prisma.storyOfTheDay.count(),
        prisma.user.count(),
        prisma.narration.count(),
        prisma.soundscape.count(),
      ]);

    console.log(
      `[seed] done: categories=${categoryCount} tribes=${tribeCount} narrators=${narratorCount} ` +
        `stories=${storyCount} storyOfTheDay=${storyOfTheDayCount} users=${userCount} ` +
        `narrations=${narrationTotal} (seeded this run: ${narrationCount}) ` +
        `soundscapes=${soundscapeCount} (dev users seeded this run: ${devUserCount})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
