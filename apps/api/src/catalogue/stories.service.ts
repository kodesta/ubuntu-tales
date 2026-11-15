import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  Paginated,
  SearchSuggestion,
  StoryCard,
  StoryDetail,
  StorySort,
} from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import type { CursorPayload } from '../common/pagination/cursor';
import { encodeCursor } from '../common/pagination/cursor';
import { AppException } from '../common/errors/app-exception';
import { PrismaService } from '../infra/prisma/prisma.service';
import { STORY_INCLUDE } from './catalogue.include';
import { toStoryCard, toStoryDetail } from './catalogue.mapper';
import { DEFAULT_EDITORIAL_TZ, editorialDateKey, pickStoryOfTheDay } from './story-of-day';
import { ViewerOverlayService } from './viewer.service';

export interface StoryListOptions {
  q?: string;
  tribe?: string;
  category?: string;
  region?: string;
  sort: StorySort;
  limit: number;
  cursor?: CursorPayload;
}

interface StoryCursorRow {
  id: string;
  publishedAt: Date | null;
  popularityScore: number;
  title: string;
}

interface StorySuggestionRow {
  slug: string;
  label: string;
  hint: string;
}

interface TribeSuggestionRow {
  slug: string;
  label: string;
  hint: string;
}

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function orderBySql(sort: StorySort): Prisma.Sql {
  switch (sort) {
    case 'popular':
      return Prisma.sql`s."popularityScore" DESC, s.id DESC`;
    case 'title':
      return Prisma.sql`s."title" ASC, s.id ASC`;
    default:
      return Prisma.sql`s."publishedAt" DESC, s.id DESC`;
  }
}

function keysetSql(sort: StorySort, cursor: CursorPayload): Prisma.Sql {
  switch (sort) {
    case 'popular':
      return Prisma.sql`(s."popularityScore" < ${cursor.v}::double precision
        OR (s."popularityScore" = ${cursor.v}::double precision AND s.id < ${cursor.id}::uuid))`;
    case 'title':
      return Prisma.sql`(s."title" > ${cursor.v}
        OR (s."title" = ${cursor.v} AND s.id > ${cursor.id}::uuid))`;
    default:
      return Prisma.sql`(s."publishedAt" < ${cursor.v}::timestamp
        OR (s."publishedAt" = ${cursor.v}::timestamp AND s.id < ${cursor.id}::uuid))`;
  }
}

function cursorValueFor(sort: StorySort, row: StoryCursorRow): string {
  switch (sort) {
    case 'popular':
      return String(row.popularityScore);
    case 'title':
      return row.title;
    default:
      return row.publishedAt ? row.publishedAt.toISOString() : '';
  }
}

@Injectable()
export class StoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly viewer: ViewerOverlayService,
  ) {}

  /**
   * Filtered, accent-insensitive story list with keyset pagination.
   * Search uses `unaccent_immutable` + `pg_trgm` expression indexes (production plan 02 §5).
   */
  async list(
    options: StoryListOptions,
    viewerId?: string | null,
  ): Promise<Paginated<StoryCard>> {
    const filters: Prisma.Sql[] = [
      Prisma.sql`s."status" = 'PUBLISHED'`,
      Prisma.sql`s."locale" = 'en'`,
      Prisma.sql`s."publishedAt" IS NOT NULL`,
    ];

    if (options.tribe) filters.push(Prisma.sql`t."slug" = ${options.tribe}`);
    if (options.category) filters.push(Prisma.sql`c."slug" = ${options.category}`);
    if (options.region) filters.push(Prisma.sql`t."region"::text = ${options.region}`);

    if (options.q) {
      const pattern = `%${escapeLike(options.q)}%`;
      filters.push(Prisma.sql`(unaccent_immutable(s."title") ILIKE unaccent_immutable(${pattern})
        OR unaccent_immutable(s."summary") ILIKE unaccent_immutable(${pattern})
        OR unaccent_immutable(coalesce(s."moral", '')) ILIKE unaccent_immutable(${pattern})
        OR unaccent_immutable(t."name") ILIKE unaccent_immutable(${pattern}))`);
    }

    if (options.cursor) filters.push(keysetSql(options.sort, options.cursor));

    const rows = await this.prisma.$queryRaw<StoryCursorRow[]>(Prisma.sql`
      SELECT s.id, s."publishedAt", s."popularityScore", s."title"
      FROM "Story" s
      JOIN "Tribe" t ON t.id = s."tribeId"
      JOIN "Category" c ON c.id = s."categoryId"
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY ${orderBySql(options.sort)}
      LIMIT ${options.limit + 1}
    `);

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    const ids = page.map((row) => row.id);

    const stories =
      ids.length === 0
        ? []
        : await this.prisma.story.findMany({
            where: { id: { in: ids } },
            include: STORY_INCLUDE,
          });

    const byId = new Map(stories.map((story) => [story.id, story]));
    const items = page.flatMap((row) => {
      const story = byId.get(row.id);
      return story ? [toStoryCard(story)] : [];
    });

    const last = page.at(-1);
    let nextCursor: string | null = null;
    if (hasMore && last) {
      const sortValue = cursorValueFor(options.sort, last);
      if (sortValue) nextCursor = encodeCursor({ v: sortValue, id: last.id });
    }

    return { items: await this.viewer.overlay(viewerId, items), nextCursor };
  }

  /** `/library/stories` — the same catalogue as `/stories`, sorted by title. */
  async listLibrary(
    options: Omit<StoryListOptions, 'sort'>,
    viewerId?: string | null,
  ): Promise<Paginated<StoryCard>> {
    return this.list({ ...options, sort: 'title' }, viewerId);
  }

  /** `/library/audio` — tales with a published narration (Phase 3). */
  async listAudio(
    options: Omit<StoryListOptions, 'sort'>,
    viewerId?: string | null,
  ): Promise<Paginated<StoryCard>> {
    const page = await this.list({ ...options, sort: 'title' }, viewerId);
    return {
      ...page,
      items: page.items.filter((story) => story.hasAudio),
    };
  }

  /**
   * Everything a downloaded tale needs to work offline (production plan 01 §4.4):
   * the structured body, the chosen narration with timings, and absolute media URLs.
   */
  async getOfflineBundle(
    slug: string,
    rendition: 'aac_64k' | 'aac_128k' = 'aac_64k',
  ): Promise<import('@ubuntu-tales/shared').OfflineBundle> {
    const detail = await this.getDetail(slug);
    const narration = detail.defaultNarration;
    return {
      story: detail,
      ...(narration ? { narration } : {}),
      rendition,
      generatedAt: new Date().toISOString(),
    };
  }

  async getDetail(slug: string, viewerId?: string | null): Promise<StoryDetail> {
    const story = await this.prisma.story.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: STORY_INCLUDE,
    });
    if (!story) throw AppException.notFound('Story');
    const detail = toStoryDetail(story);
    const [overlaid] = await this.viewer.overlay(viewerId, [detail]);
    return (overlaid ?? detail) as StoryDetail;
  }

  /**
   * Four recommendations: same tribe/category/region ranked by popularity. Authenticated callers may
   * exclude stories they have already completed (`excludeStoryIds`) and receive `viewer` overlays.
   */
  async getRecommendations(
    slug: string,
    options: { viewerId?: string | null; excludeStoryIds?: readonly string[] } = {},
  ): Promise<StoryCard[]> {
    const story = await this.prisma.story.findFirst({
      where: { slug, status: 'PUBLISHED' },
      select: {
        id: true,
        tribeId: true,
        categoryId: true,
        tribe: { select: { region: true } },
      },
    });
    if (!story) throw AppException.notFound('Story');

    const excluded = options.excludeStoryIds ?? [];
    const candidates = await this.prisma.story.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: story.id, ...(excluded.length > 0 ? { notIn: [...excluded] } : {}) },
        OR: [
          { tribeId: story.tribeId },
          { categoryId: story.categoryId },
          { tribe: { region: story.tribe.region } },
        ],
      },
      include: STORY_INCLUDE,
      orderBy: [{ popularityScore: 'desc' }, { publishedAt: 'desc' }],
      take: 4,
    });

    const recommendations = candidates.map(toStoryCard);
    if (recommendations.length < 4) {
      const excludedIds = [
        story.id,
        ...excluded,
        ...candidates.map((candidate) => candidate.id),
      ];
      const filler = await this.prisma.story.findMany({
        where: { status: 'PUBLISHED', id: { notIn: excludedIds } },
        include: STORY_INCLUDE,
        orderBy: [{ popularityScore: 'desc' }, { publishedAt: 'desc' }],
        take: 4 - recommendations.length,
      });
      recommendations.push(...filler.map(toStoryCard));
    }

    return this.viewer.overlay(options.viewerId, recommendations);
  }

  /** Search-as-you-type suggestions mixing up to 5 stories and 3 tribes (max 8). */
  async getSuggestions(rawQuery: string): Promise<SearchSuggestion[]> {
    const query = rawQuery.trim();
    if (!query) return [];

    const pattern = `%${escapeLike(query)}%`;
    const prefixPattern = `${escapeLike(query)}%`;

    const storyRows = await this.prisma.$queryRaw<StorySuggestionRow[]>(Prisma.sql`
      SELECT s.slug AS "slug", s.title AS "label", t.name AS "hint"
      FROM "Story" s
      JOIN "Tribe" t ON t.id = s."tribeId"
      WHERE s."status" = 'PUBLISHED'
        AND (unaccent_immutable(s."title") ILIKE unaccent_immutable(${pattern})
          OR unaccent_immutable(s."summary") ILIKE unaccent_immutable(${pattern})
          OR unaccent_immutable(coalesce(s."moral", '')) ILIKE unaccent_immutable(${pattern})
          OR unaccent_immutable(t."name") ILIKE unaccent_immutable(${pattern}))
      ORDER BY (unaccent_immutable(s."title") ILIKE unaccent_immutable(${prefixPattern})) DESC,
        s."popularityScore" DESC, s."title" ASC
      LIMIT 5
    `);

    const tribeRows = await this.prisma.$queryRaw<TribeSuggestionRow[]>(Prisma.sql`
      SELECT t.slug AS "slug", t.name AS "label", t."countriesLabel" AS "hint"
      FROM "Tribe" t
      WHERE t."isActive" = true
        AND unaccent_immutable(t."name") ILIKE unaccent_immutable(${pattern})
      ORDER BY t."sortOrder" ASC, t."name" ASC
      LIMIT 3
    `);

    const suggestions: SearchSuggestion[] = [];
    const maxSuggestions = 8;
    const rounds = Math.max(storyRows.length, tribeRows.length);

    for (let index = 0; index < rounds && suggestions.length < maxSuggestions; index += 1) {
      const story = storyRows[index];
      if (story) {
        suggestions.push({ type: 'story', slug: story.slug, label: story.label, hint: story.hint });
      }
      if (suggestions.length >= maxSuggestions) break;

      const tribe = tribeRows[index];
      if (tribe) {
        suggestions.push({ type: 'tribe', slug: tribe.slug, label: tribe.label, hint: tribe.hint });
      }
    }

    return suggestions;
  }

  /** Editorial pick for today, else a deterministic fallback across featured/published stories. */
  async getStoryOfTheDay(viewerId?: string | null): Promise<StoryCard> {
    const timezone = this.config.get<string>('EDITORIAL_TZ') ?? DEFAULT_EDITORIAL_TZ;
    const dateKey = editorialDateKey(new Date(), timezone);
    const today = new Date(`${dateKey}T00:00:00.000Z`);

    const scheduled = await this.prisma.storyOfTheDay.findUnique({
      where: { date_locale: { date: today, locale: 'en' } },
      include: { story: { include: STORY_INCLUDE } },
    });
    if (scheduled?.story.status === 'PUBLISHED') {
      const [card] = await this.viewer.overlay(viewerId, [toStoryCard(scheduled.story)]);
      return card ?? toStoryCard(scheduled.story);
    }

    let candidates = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED', isFeatured: true },
      include: STORY_INCLUDE,
      orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
      take: 50,
    });
    if (candidates.length === 0) {
      candidates = await this.prisma.story.findMany({
        where: { status: 'PUBLISHED' },
        include: STORY_INCLUDE,
        orderBy: [{ publishedAt: 'asc' }, { id: 'asc' }],
        take: 200,
      });
    }

    const picked = pickStoryOfTheDay(dateKey, candidates);
    if (!picked) throw AppException.notFound('Story of the day');
    const [card] = await this.viewer.overlay(viewerId, [toStoryCard(picked)]);
    return card ?? toStoryCard(picked);
  }
}
