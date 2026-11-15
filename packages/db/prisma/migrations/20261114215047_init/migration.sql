-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTH_AFRICA', 'WEST_AFRICA', 'CENTRAL_AFRICA', 'EAST_AFRICA', 'SOUTHERN_AFRICA');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('JOY', 'GREAT', 'GOOD', 'THINKING', 'HAPPY');

-- CreateTable
CREATE TABLE "Tribe" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" "Region" NOT NULL,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "countriesLabel" TEXT NOT NULL,
    "tagline" VARCHAR(200),
    "description" TEXT,
    "accentColor" VARCHAR(7) NOT NULL,
    "themeVariant" TEXT,
    "imageUrl" TEXT,
    "imageAlt" TEXT,
    "imageAccent" VARCHAR(7),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "publishedStoryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tribe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Narrator" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "roleLabel" TEXT,
    "accentColor" VARCHAR(7),
    "avatarUrl" TEXT,
    "avatarAlt" TEXT,
    "avatarAccent" VARCHAR(7),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Narrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Story" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "title" VARCHAR(160) NOT NULL,
    "summary" VARCHAR(400) NOT NULL,
    "moral" VARCHAR(300),
    "body" JSONB NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "readTimeMinutes" INTEGER NOT NULL,
    "tribeId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "narratorId" UUID,
    "regionLabel" TEXT,
    "coverUrl" TEXT NOT NULL,
    "coverAlt" TEXT NOT NULL,
    "coverAccent" VARCHAR(7) NOT NULL,
    "attribution" TEXT,
    "status" "StoryStatus" NOT NULL DEFAULT 'PUBLISHED',
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'FREE',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "popularityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryOfTheDay" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
    "storyId" UUID NOT NULL,

    CONSTRAINT "StoryOfTheDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tribe_slug_key" ON "Tribe"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tribe_name_key" ON "Tribe"("name");

-- CreateIndex
CREATE INDEX "Tribe_region_isActive_idx" ON "Tribe"("region", "isActive");

-- CreateIndex
CREATE INDEX "Tribe_isActive_sortOrder_idx" ON "Tribe"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_sortOrder_idx" ON "Category"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Narrator_slug_key" ON "Narrator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Story_slug_key" ON "Story"("slug");

-- CreateIndex
CREATE INDEX "Story_status_publishedAt_idx" ON "Story"("status", "publishedAt" DESC);

-- CreateIndex
CREATE INDEX "Story_status_popularityScore_idx" ON "Story"("status", "popularityScore" DESC);

-- CreateIndex
CREATE INDEX "Story_status_title_idx" ON "Story"("status", "title");

-- CreateIndex
CREATE INDEX "Story_tribeId_status_idx" ON "Story"("tribeId", "status");

-- CreateIndex
CREATE INDEX "Story_categoryId_status_idx" ON "Story"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Story_narratorId_status_idx" ON "Story"("narratorId", "status");

-- CreateIndex
CREATE INDEX "Story_locale_status_idx" ON "Story"("locale", "status");

-- CreateIndex
CREATE INDEX "StoryOfTheDay_storyId_idx" ON "StoryOfTheDay"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryOfTheDay_date_locale_key" ON "StoryOfTheDay"("date", "locale");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_tribeId_fkey" FOREIGN KEY ("tribeId") REFERENCES "Tribe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_narratorId_fkey" FOREIGN KEY ("narratorId") REFERENCES "Narrator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryOfTheDay" ADD CONSTRAINT "StoryOfTheDay_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───────────── Search infrastructure (production plan 02 §5, adapted) ─────────────
-- Phase 1 has no generated `searchVector` column: search uses `unaccent` + `pg_trgm` in the query
-- (see DEVIATIONS.md 0.4). The trgm expression indexes make the accent-insensitive ILIKE search
-- indexable. `unaccent_immutable` is created by infra/postgres/init for local dev; the migration
-- recreates it idempotently so a fresh database works from migrations alone.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION unaccent_immutable(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE INDEX IF NOT EXISTS story_title_trgm_idx
  ON "Story" USING GIN (unaccent_immutable("title") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS story_summary_trgm_idx
  ON "Story" USING GIN (unaccent_immutable("summary") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS story_moral_trgm_idx
  ON "Story" USING GIN (unaccent_immutable("moral") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tribe_name_trgm_idx
  ON "Tribe" USING GIN (unaccent_immutable("name") gin_trgm_ops);
