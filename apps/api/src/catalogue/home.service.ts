import { Injectable } from '@nestjs/common';
import { storyBodySchema, type HomeResponse, type WisdomNote } from '@ubuntu-tales/shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { STORY_INCLUDE } from './catalogue.include';
import { toStoryCard, toTribeSummary } from './catalogue.mapper';
import { StoriesService } from './stories.service';
import { ViewerOverlayService } from './viewer.service';

const LATEST_LIMIT = 6;
const POPULAR_LIMIT = 4;
const YOUR_TRIBE_LIMIT = 4;
const WISDOM_LIMIT = 5;

@Injectable()
export class HomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stories: StoriesService,
    private readonly categories: CategoriesService,
    private readonly viewer: ViewerOverlayService,
  ) {}

  /**
   * Home screen payload. When authenticated, the account's tribe wins over the guest `?tribe=`
   * parameter, and every `StoryCard` carries the caller's `viewer` overlay.
   */
  async getHome(
    options: {
      tribeSlug?: string;
      /** When set, the account's tribe wins over the guest `?tribe=` parameter. */
      accountTribeId?: string | null;
      viewerId?: string | null;
    } = {},
  ): Promise<HomeResponse> {
    const [storyOfTheDay, latest, popular, categories, wisdomNotes] = await Promise.all([
      this.stories.getStoryOfTheDay(),
      this.prisma.story.findMany({
        where: { status: 'PUBLISHED' },
        include: STORY_INCLUDE,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: LATEST_LIMIT,
      }),
      this.prisma.story.findMany({
        where: { status: 'PUBLISHED' },
        include: STORY_INCLUDE,
        orderBy: [{ popularityScore: 'desc' }, { publishedAt: 'desc' }],
        take: POPULAR_LIMIT,
      }),
      this.categories.list(),
      this.getWisdomNotes(WISDOM_LIMIT),
    ]);

    const effectiveTribeSlug = options.accountTribeId
      ? ((await this.findTribeSlug(options.accountTribeId)) ?? options.tribeSlug)
      : options.tribeSlug;
    const yourTribe = effectiveTribeSlug ? await this.getYourTribe(effectiveTribeSlug) : undefined;

    const latestCards = latest.map(toStoryCard);
    const popularCards = popular.map(toStoryCard);
    const tribeStories = yourTribe?.stories ?? [];

    // One batched overlay query set for the whole payload (plan 05 §3.6: compute per request).
    const overlaid = await this.viewer.overlay(options.viewerId, [
      storyOfTheDay,
      ...latestCards,
      ...popularCards,
      ...tribeStories,
    ]);
    const storyOfTheDayCard = overlaid[0] ?? storyOfTheDay;
    const latestStart = 1;
    const popularStart = latestStart + latestCards.length;
    const tribeStart = popularStart + popularCards.length;

    return {
      storyOfTheDay: storyOfTheDayCard,
      latest: overlaid.slice(latestStart, popularStart),
      categories,
      wisdomNotes,
      popular: overlaid.slice(popularStart, tribeStart),
      ...(yourTribe
        ? { yourTribe: { tribe: yourTribe.tribe, stories: overlaid.slice(tribeStart) } }
        : {}),
    };
  }

  /** Resolves an account tribe id to its public slug (returns null for missing/inactive tribes). */
  async findTribeSlug(tribeId: string): Promise<string | null> {
    const tribe = await this.prisma.tribe.findFirst({
      where: { id: tribeId, isActive: true },
      select: { slug: true },
    });
    return tribe?.slug ?? null;
  }

  private async getYourTribe(tribeSlug: string): Promise<HomeResponse['yourTribe'] | undefined> {
    const tribe = await this.prisma.tribe.findFirst({
      where: { slug: tribeSlug, isActive: true },
    });
    if (!tribe) return undefined;

    const stories = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED', tribeId: tribe.id },
      include: STORY_INCLUDE,
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: YOUR_TRIBE_LIMIT,
    });

    return { tribe: toTribeSummary(tribe), stories: stories.map(toStoryCard) };
  }

  /**
   * Wisdom notes are the moral of a tale + its publication. Tales without a moral fall back to
   * their opening sentence so the home feed always has a few lines of editorial texture.
   */
  private async getWisdomNotes(limit: number): Promise<WisdomNote[]> {
    const rows = await this.prisma.story.findMany({
      where: { status: 'PUBLISHED' },
      include: { tribe: { select: { name: true } } },
      orderBy: [{ popularityScore: 'desc' }, { publishedAt: 'desc' }],
      take: 30,
    });

    const withMoral = rows.filter((row) => row.moral !== null);
    const withoutMoral = rows.filter((row) => row.moral === null);
    const notes: WisdomNote[] = [];

    for (const story of [...withMoral, ...withoutMoral]) {
      if (notes.length >= limit) break;

      const quote = story.moral ?? this.firstSentence(story.body);
      if (!quote) continue;

      notes.push({
        id: story.id,
        quote,
        storySlug: story.slug,
        storyTitle: story.title,
        tribeName: story.tribe.name,
      });
    }

    return notes;
  }

  private firstSentence(body: unknown): string | null {
    const parsed = storyBodySchema.safeParse(body);
    if (!parsed.success) return null;
    const firstParagraph = parsed.data.paragraphs[0];
    return firstParagraph?.sentences[0]?.text ?? null;
  }
}
