import {
  REGION_LABELS,
  storyBodySchema,
  type AuthorDetail,
  type AuthorSummary,
  type CategorySummary,
  type ImageRef,
  type NarratorSummary,
  type Region,
  type StoryCard,
  type StoryDetail,
  type TribeDetail,
  type TribeSummary,
} from '@ubuntu-tales/shared';

/**
 * Structural row types for the catalogue mappers. They mirror the Prisma models we read (plus the
 * relations included by the services) without importing the generated client at runtime, so the
 * mappers are unit-testable without a database.
 */

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  badge: string;
}

export interface TribeRow {
  id: string;
  slug: string;
  name: string;
  region: Region;
  countriesLabel: string;
  tagline: string | null;
  description: string | null;
  accentColor: string;
  themeVariant: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageAccent: string | null;
  subscriberCount: number;
  publishedStoryCount: number;
}

export interface NarratorRow {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  roleLabel: string | null;
  accentColor: string | null;
  avatarUrl: string | null;
  avatarAlt: string | null;
  avatarAccent: string | null;
}

export interface StoryRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  moral: string | null;
  body: unknown;
  wordCount: number;
  readTimeMinutes: number;
  regionLabel: string | null;
  coverUrl: string;
  coverAlt: string;
  coverAccent: string;
  attribution: string | null;
  isFeatured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  tribe: TribeRow;
  category: CategoryRow;
  narrator: NarratorRow | null;
}

/** The plan's canonical 3:2 cover rendition (production plan 03 §1). */
export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 800;
/** Publication marks / avatars are square in the editorial design. */
export const MARK_SIZE = 600;

export function coverImageRef(
  row: Pick<StoryRow, 'coverUrl' | 'coverAlt' | 'coverAccent'>,
): ImageRef {
  return {
    url: row.coverUrl,
    alt: row.coverAlt,
    accent: row.coverAccent,
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
  };
}

export function tribeImageRef(tribe: TribeRow): ImageRef | undefined {
  if (!tribe.imageUrl) return undefined;
  return {
    url: tribe.imageUrl,
    alt: tribe.imageAlt ?? tribe.name,
    accent: tribe.imageAccent ?? tribe.accentColor,
    width: MARK_SIZE,
    height: MARK_SIZE,
  };
}

export function avatarImageRef(narrator: NarratorRow): ImageRef | undefined {
  if (!narrator.avatarUrl) return undefined;
  return {
    url: narrator.avatarUrl,
    alt: narrator.avatarAlt ?? narrator.name,
    ...(narrator.avatarAccent ? { accent: narrator.avatarAccent } : {}),
    width: MARK_SIZE,
    height: MARK_SIZE,
  };
}

export function toCategorySummary(category: CategoryRow): CategorySummary {
  return { id: category.id, slug: category.slug, name: category.name, badge: category.badge };
}

export function toNarratorSummary(narrator: NarratorRow): NarratorSummary {
  const avatar = avatarImageRef(narrator);
  return {
    id: narrator.id,
    slug: narrator.slug,
    name: narrator.name,
    ...(narrator.bio ? { bio: narrator.bio } : {}),
    ...(narrator.roleLabel ? { roleLabel: narrator.roleLabel } : {}),
    ...(narrator.accentColor ? { accentColor: narrator.accentColor } : {}),
    ...(avatar ? { avatar } : {}),
  };
}

export function toTribeSummary(tribe: TribeRow): TribeSummary {
  const image = tribeImageRef(tribe);
  return {
    id: tribe.id,
    slug: tribe.slug,
    name: tribe.name,
    region: tribe.region,
    countriesLabel: tribe.countriesLabel,
    accentColor: tribe.accentColor,
    publishedStoryCount: tribe.publishedStoryCount,
    subscriberCount: tribe.subscriberCount,
    ...(tribe.tagline ? { tagline: tribe.tagline } : {}),
    ...(tribe.description ? { description: tribe.description } : {}),
    ...(tribe.themeVariant ? { themeVariant: tribe.themeVariant } : {}),
    ...(image ? { image } : {}),
  };
}

export function storyPublishedAt(row: Pick<StoryRow, 'publishedAt' | 'createdAt'>): string {
  return (row.publishedAt ?? row.createdAt).toISOString();
}

export function toStoryCard(row: StoryRow): StoryCard {
  const narrator = row.narrator ? toNarratorSummary(row.narrator) : undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    ...(row.moral ? { moral: row.moral } : {}),
    category: toCategorySummary(row.category),
    tribe: {
      id: row.tribe.id,
      slug: row.tribe.slug,
      name: row.tribe.name,
      accentColor: row.tribe.accentColor,
    },
    regionLabel: row.regionLabel ?? REGION_LABELS[row.tribe.region],
    readTimeMinutes: row.readTimeMinutes,
    hasAudio: false,
    cover: coverImageRef(row),
    publishedAt: storyPublishedAt(row),
    ...(narrator ? { narrator } : {}),
    isFeatured: row.isFeatured,
  };
}

export function toStoryDetail(row: StoryRow): StoryDetail {
  const parsed = storyBodySchema.safeParse(row.body);
  if (!parsed.success) {
    throw new Error(`Stored body for story "${row.slug}" is not a valid StoryBody.`);
  }

  return {
    ...toStoryCard(row),
    body: parsed.data,
    ...(row.attribution ? { attribution: row.attribution } : {}),
  };
}

export function toTribeDetail(
  tribe: TribeRow,
  featuredStories: StoryRow[],
  latestStories: StoryRow[],
): TribeDetail {
  return {
    ...toTribeSummary(tribe),
    featuredStories: featuredStories.map(toStoryCard),
    latestStories: latestStories.map(toStoryCard),
  };
}

export function toAuthorSummary(
  narrator: NarratorRow,
  publishedStoryCount: number,
  tribeNames: string[] = [],
): AuthorSummary {
  const avatar = avatarImageRef(narrator);
  const uniqueTribeNames = Array.from(new Set(tribeNames));
  return {
    id: narrator.id,
    slug: narrator.slug,
    name: narrator.name,
    ...(narrator.bio ? { bio: narrator.bio } : {}),
    ...(narrator.roleLabel ? { roleLabel: narrator.roleLabel } : {}),
    ...(narrator.accentColor ? { accentColor: narrator.accentColor } : {}),
    ...(avatar ? { avatar } : {}),
    publishedStoryCount,
    ...(uniqueTribeNames.length > 0 ? { tribeNames: uniqueTribeNames } : {}),
  };
}

export function toAuthorDetail(
  narrator: NarratorRow,
  publishedStoryCount: number,
  stories: StoryRow[],
): AuthorDetail {
  return {
    ...toAuthorSummary(narrator, publishedStoryCount),
    stories: stories.map(toStoryCard),
  };
}
