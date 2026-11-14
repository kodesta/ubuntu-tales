import { z } from 'zod';
import { REGIONS } from './constants';
import { storyBodySchema } from './story-body';

/**
 * Schemas for the editorial content files under `/content`, consumed by the seed script.
 * Keeping content as plain, reviewable JSON keeps the catalogue portable and lets writers work
 * without touching the database.
 */

export const contentCoverSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  width: z.number().int().positive().default(1200),
  height: z.number().int().positive().default(800),
});

export const contentTribeSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  region: z.enum(REGIONS),
  countries: z.array(z.string()).default([]),
  countriesLabel: z.string().min(1),
  tagline: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  themeVariant: z.string().optional(),
  sortOrder: z.number().int().default(0),
  subscriberCount: z.number().int().nonnegative().default(0),
  image: contentCoverSchema.optional(),
});

export const contentCategorySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  badge: z.string().min(1),
  sortOrder: z.number().int().default(0),
});

export const contentNarratorSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  bio: z.string().min(1).optional(),
  roleLabel: z.string().min(1).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const contentStorySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(160),
  summary: z.string().min(1).max(400),
  moral: z.string().max(300).optional(),
  tribeSlug: z.string().min(1),
  categorySlug: z.string().min(1),
  narratorSlug: z.string().optional(),
  regionLabel: z.string().optional(),
  attribution: z.string().optional(),
  cover: contentCoverSchema,
  body: storyBodySchema,
  /** ISO date or date-time; the seed normalises it to UTC. */
  publishedAt: z.string().min(1),
  isFeatured: z.boolean().default(false),
  popularityScore: z.number().nonnegative().default(0),
});

export type ContentCover = z.infer<typeof contentCoverSchema>;
export type ContentTribe = z.infer<typeof contentTribeSchema>;
export type ContentCategory = z.infer<typeof contentCategorySchema>;
export type ContentNarrator = z.infer<typeof contentNarratorSchema>;
export type ContentStory = z.infer<typeof contentStorySchema>;
