import { Injectable } from '@nestjs/common';
import type { AuthorDetail, AuthorSummary, Paginated } from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../common/errors/app-exception';
import type { CursorPayload } from '../common/pagination/cursor';
import { encodeCursor } from '../common/pagination/cursor';
import { PrismaService } from '../infra/prisma/prisma.service';
import { STORY_INCLUDE } from './catalogue.include';
import { toAuthorSummary, toStoryCard } from './catalogue.mapper';
import { ViewerOverlayService } from './viewer.service';

export interface AuthorListOptions {
  q?: string;
  limit: number;
  cursor?: CursorPayload;
}

@Injectable()
export class AuthorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly viewer: ViewerOverlayService,
  ) {}

  /**
   * Paginated list of griots (narrators) with at least one published tale. Sorted by name; the
   * cursor keyset is `(name, id)`.
   */
  async list(options: AuthorListOptions): Promise<Paginated<AuthorSummary>> {
    const where: Prisma.NarratorWhereInput = {
      stories: { some: { status: 'PUBLISHED' } },
    };
    if (options.q) where.name = { contains: options.q, mode: 'insensitive' };
    if (options.cursor) {
      const cursor = options.cursor;
      where.AND = [
        {
          OR: [{ name: { gt: cursor.v } }, { name: cursor.v, id: { gt: cursor.id } }],
        },
      ];
    }

    const narrators = await this.prisma.narrator.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: options.limit + 1,
      include: {
        _count: { select: { stories: { where: { status: 'PUBLISHED' } } } },
        stories: {
          where: { status: 'PUBLISHED' },
          select: { tribe: { select: { name: true } } },
          orderBy: { publishedAt: 'desc' },
          take: 20,
        },
      },
    });

    const hasMore = narrators.length > options.limit;
    const page = hasMore ? narrators.slice(0, options.limit) : narrators;

    const items = page.map((narrator) =>
      toAuthorSummary(
        narrator,
        narrator._count.stories,
        narrator.stories.map((story) => story.tribe.name),
      ),
    );

    const last = page.at(-1);
    const nextCursor = hasMore && last ? encodeCursor({ v: last.name, id: last.id }) : null;

    return { items, nextCursor };
  }

  async getDetail(slug: string, viewerId?: string | null): Promise<AuthorDetail> {
    const narrator = await this.prisma.narrator.findUnique({
      where: { slug },
      include: {
        _count: { select: { stories: { where: { status: 'PUBLISHED' } } } },
        stories: {
          where: { status: 'PUBLISHED' },
          include: STORY_INCLUDE,
          orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
          take: 50,
        },
      },
    });

    if (!narrator) throw AppException.notFound('Author');
    return {
      ...toAuthorSummary(narrator, narrator._count.stories),
      stories: await this.viewer.overlay(viewerId, narrator.stories.map(toStoryCard)),
    };
  }
}
