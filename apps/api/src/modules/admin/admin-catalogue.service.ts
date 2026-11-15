import { Injectable } from '@nestjs/common';
import type {
  CategoryInput,
  CategorySummary,
  NarratorInput,
  StoryOfDayEntry,
  TribeInput,
  TribeSummary,
} from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { toCategorySummary, toTribeSummary } from '../../catalogue/catalogue.mapper';

@Injectable()
export class AdminCatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async createTribe(input: TribeInput): Promise<TribeSummary> {
    const existing = await this.prisma.tribe.findUnique({ where: { slug: input.slug } });
    if (existing) throw AppException.conflict('That tribe slug already exists.');
    const tribe = await this.prisma.tribe.create({
      data: {
        slug: input.slug,
        name: input.name,
        region: input.region,
        countries: input.countries,
        countriesLabel: input.countriesLabel,
        ...(input.tagline ? { tagline: input.tagline } : {}),
        ...(input.description ? { description: input.description } : {}),
        accentColor: input.accentColor,
        ...(input.themeVariant ? { themeVariant: input.themeVariant } : {}),
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    return toTribeSummary(tribe);
  }

  async updateTribe(id: string, input: Partial<TribeInput>): Promise<TribeSummary> {
    const existing = await this.prisma.tribe.findUnique({ where: { id } });
    if (!existing) throw AppException.notFound('Tribe');
    const tribe = await this.prisma.tribe.update({
      where: { id },
      data: {
        ...(input.slug ? { slug: input.slug } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.region ? { region: input.region } : {}),
        ...(input.countries ? { countries: input.countries } : {}),
        ...(input.countriesLabel ? { countriesLabel: input.countriesLabel } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.accentColor ? { accentColor: input.accentColor } : {}),
        ...(input.themeVariant !== undefined ? { themeVariant: input.themeVariant } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toTribeSummary(tribe);
  }

  async createCategory(input: CategoryInput): Promise<CategorySummary> {
    const existing = await this.prisma.category.findUnique({ where: { slug: input.slug } });
    if (existing) throw AppException.conflict('That category slug already exists.');
    const category = await this.prisma.category.create({
      data: {
        slug: input.slug,
        name: input.name,
        badge: input.badge,
        sortOrder: input.sortOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
    return toCategorySummary(category);
  }

  async updateCategory(id: string, input: Partial<CategoryInput>): Promise<CategorySummary> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw AppException.notFound('Category');
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        ...(input.slug ? { slug: input.slug } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.badge ? { badge: input.badge } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    return toCategorySummary(category);
  }

  async createNarrator(input: NarratorInput): Promise<{ id: string; slug: string; name: string }> {
    const existing = await this.prisma.narrator.findUnique({ where: { slug: input.slug } });
    if (existing) throw AppException.conflict('That narrator slug already exists.');
    const narrator = await this.prisma.narrator.create({
      data: {
        slug: input.slug,
        name: input.name,
        ...(input.bio ? { bio: input.bio } : {}),
        ...(input.roleLabel ? { roleLabel: input.roleLabel } : {}),
        ...(input.accentColor ? { accentColor: input.accentColor } : {}),
      },
    });
    return { id: narrator.id, slug: narrator.slug, name: narrator.name };
  }

  async updateNarrator(id: string, input: Partial<NarratorInput>): Promise<{ id: string; slug: string; name: string }> {
    const existing = await this.prisma.narrator.findUnique({ where: { id } });
    if (!existing) throw AppException.notFound('Narrator');
    const narrator = await this.prisma.narrator.update({
      where: { id },
      data: {
        ...(input.slug ? { slug: input.slug } : {}),
        ...(input.name ? { name: input.name } : {}),
        ...(input.bio !== undefined ? { bio: input.bio } : {}),
        ...(input.roleLabel !== undefined ? { roleLabel: input.roleLabel } : {}),
        ...(input.accentColor !== undefined ? { accentColor: input.accentColor } : {}),
      },
    });
    return { id: narrator.id, slug: narrator.slug, name: narrator.name };
  }

  async listStoryOfTheDay(from: string, to: string): Promise<StoryOfDayEntry[]> {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw AppException.validation('Dates must look like YYYY-MM-DD.');
    }
    const rows = await this.prisma.storyOfTheDay.findMany({
      where: { date: { gte: start, lte: end } },
      include: { story: { select: { id: true, slug: true, title: true } } },
      orderBy: { date: 'asc' },
    });
    return rows.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      storyId: row.story.id,
      storySlug: row.story.slug,
      title: row.story.title,
    }));
  }

  async setStoryOfTheDay(date: string, storyId: string): Promise<StoryOfDayEntry> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story || story.status !== 'PUBLISHED') {
      throw AppException.validation('Only published tales can be the story of the day.', [{ field: 'storyId', message: 'Choose a published tale.' }]);
    }
    const day = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) throw AppException.validation('Date must look like YYYY-MM-DD.');
    const row = await this.prisma.storyOfTheDay.upsert({
      where: { date_locale: { date: day, locale: 'en' } },
      create: { date: day, locale: 'en', storyId },
      update: { storyId },
      include: { story: { select: { id: true, slug: true, title: true } } },
    });
    return {
      date: row.date.toISOString().slice(0, 10),
      storyId: row.story.id,
      storySlug: row.story.slug,
      title: row.story.title,
    };
  }

  async removeStoryOfTheDay(date: string): Promise<{ ok: true }> {
    const day = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(day.getTime())) throw AppException.validation('Date must look like YYYY-MM-DD.');
    await this.prisma.storyOfTheDay.deleteMany({ where: { date: day, locale: 'en' } });
    return { ok: true };
  }
}
