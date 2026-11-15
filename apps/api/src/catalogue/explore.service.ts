import { Injectable } from '@nestjs/common';
import type {
  ExplorePoint,
  ExploreRegionSummary,
  ExploreResponse,
  Region,
  StoryCard,
} from '@ubuntu-tales/shared';
import { PrismaService } from '../infra/prisma/prisma.service';
import { STORY_INCLUDE } from './catalogue.include';
import { toStoryCard, toTribeSummary } from './catalogue.mapper';

const FEATURED_PER_PUBLICATION = 3;

/**
 * `/explore` (map view): every active publication with a curated homeland coordinate, plus a few
 * tales from each so the map is a doorway into the catalogue rather than a diagram.
 */
@Injectable()
export class ExploreService {
  constructor(private readonly prisma: PrismaService) {}

  async getMap(): Promise<ExploreResponse> {
    const [tribes, stories] = await Promise.all([
      this.prisma.tribe.findMany({
        where: { isActive: true, latitude: { not: null }, longitude: { not: null } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.story.findMany({
        where: { status: 'PUBLISHED' },
        include: STORY_INCLUDE,
        orderBy: [{ popularityScore: 'desc' }, { publishedAt: 'desc' }],
        take: 400,
      }),
    ]);

    const byTribe = new Map<string, StoryCard[]>();
    for (const story of stories) {
      const list = byTribe.get(story.tribeId) ?? [];
      if (list.length < FEATURED_PER_PUBLICATION) list.push(toStoryCard(story));
      byTribe.set(story.tribeId, list);
    }

    const points: ExplorePoint[] = tribes.map((tribe) => {
      const featuredStories = byTribe.get(tribe.id) ?? [];
      return {
        tribe: toTribeSummary(tribe),
        latitude: tribe.latitude ?? 0,
        longitude: tribe.longitude ?? 0,
        ...(tribe.mapPlaceLabel ? { placeLabel: tribe.mapPlaceLabel } : {}),
        storyCount: tribe.publishedStoryCount,
        featuredStories,
      };
    });

    // Map pins are only useful where there is something to read.
    const populated: ExplorePoint[] = points
      .filter((point) => point.storyCount > 0)
      .sort((a, b) => b.storyCount - a.storyCount || a.tribe.name.localeCompare(b.tribe.name));

    return {
      points: populated,
      regions: this.summariseRegions(points),
      totalStories: populated.reduce((total, point) => total + point.storyCount, 0),
      totalPublications: populated.length,
    };
  }

  private summariseRegions(points: ExplorePoint[]): ExploreRegionSummary[] {
    const byRegion = new Map<Region, ExploreRegionSummary>();
    for (const point of points) {
      const region = point.tribe.region;
      const current = byRegion.get(region) ?? {
        region,
        publicationCount: 0,
        storyCount: 0,
      };
      current.publicationCount += 1;
      current.storyCount += point.storyCount;
      byRegion.set(region, current);
    }
    return [...byRegion.values()].sort((a, b) => b.storyCount - a.storyCount);
  }
}
