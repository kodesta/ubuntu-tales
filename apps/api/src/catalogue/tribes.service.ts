import { Injectable } from '@nestjs/common';
import type { Region, TribeDetail, TribeSummary } from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../common/errors/app-exception';
import { PrismaService } from '../infra/prisma/prisma.service';
import { STORY_INCLUDE } from './catalogue.include';
import { toStoryCard, toTribeSummary } from './catalogue.mapper';
import { ViewerOverlayService } from './viewer.service';

export interface TribeListOptions {
  q?: string;
  region?: Region;
}

@Injectable()
export class TribesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly viewer: ViewerOverlayService,
  ) {}

  /** Publications are not paginated (< 200 rows), sorted by editorial `sortOrder`. */
  async list(options: TribeListOptions): Promise<TribeSummary[]> {
    const where: Prisma.TribeWhereInput = { isActive: true };
    if (options.region) where.region = options.region;
    if (options.q) where.name = { contains: options.q, mode: 'insensitive' };

    const tribes = await this.prisma.tribe.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return tribes.map(toTribeSummary);
  }

  async getDetail(slug: string, viewerId?: string | null): Promise<TribeDetail> {
    const tribe = await this.prisma.tribe.findFirst({
      where: { slug, isActive: true },
    });
    if (!tribe) throw AppException.notFound('Tribe');

    const [featured, latest] = await Promise.all([
      this.prisma.story.findMany({
        where: { tribeId: tribe.id, status: 'PUBLISHED', isFeatured: true },
        include: STORY_INCLUDE,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
      this.prisma.story.findMany({
        where: { tribeId: tribe.id, status: 'PUBLISHED' },
        include: STORY_INCLUDE,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: 6,
      }),
    ]);

    const featuredRows = featured.length > 0 ? featured : latest.slice(0, 6);
    const [featuredStories, latestStories] = await Promise.all([
      this.viewer.overlay(viewerId, featuredRows.map(toStoryCard)),
      this.viewer.overlay(viewerId, latest.map(toStoryCard)),
    ]);

    return {
      ...toTribeSummary(tribe),
      featuredStories,
      latestStories,
    };
  }
}
