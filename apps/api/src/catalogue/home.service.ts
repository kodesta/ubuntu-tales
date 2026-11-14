import { Injectable } from '@nestjs/common';
import { storyBodySchema, type HomeResponse, type WisdomNote } from '@ubuntu-tales/shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { STORY_INCLUDE } from './catalogue.include';
import { toStoryCard, toTribeSummary } from './catalogue.mapper';
import { StoriesService } from './stories.service';

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
  ) {}

  async getHome(tribeSlug?: string): Promise<HomeResponse> {
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

    const yourTribe = tribeSlug ? await this.getYourTribe(tribeSlug) : undefined;

    return {
      storyOfTheDay,
      latest: latest.map(toStoryCard),
      categories,
      wisdomNotes,
      popular: popular.map(toStoryCard),
      ...(yourTribe ? { yourTribe } : {}),
    };
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
