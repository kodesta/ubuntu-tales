import { Injectable } from '@nestjs/common';
import type {
  OkResponse,
  Paginated,
  ReactionType,
  SavedFilter,
  SavedStoryItem,
} from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../../common/errors/app-exception';
import {
  encodeCursor,
  type CursorPayload,
} from '../../common/pagination/cursor';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { STORY_INCLUDE } from '../../catalogue/catalogue.include';
import { toStoryCard } from '../../catalogue/catalogue.mapper';
import { parseCursorDate } from './progress.logic';
import {
  ACTIVITY_STORY_SELECT,
  assertStoryFound,
  publishedStoryWhere,
} from './story-ref';

export interface SavedListOptions {
  filter: SavedFilter;
  limit: number;
  cursor?: CursorPayload;
  /** Required for `filter=offline`: downloads are per browser install. */
  deviceId?: string;
}

/**
 * `/me/saved` (production plan 03 §2.7): the reading list with the story card, save time, progress
 * and reaction. `filter=offline` lists the tales downloaded on the given device (Phase 3).
 */
@Injectable()
export class SavedService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, options: SavedListOptions): Promise<Paginated<SavedStoryItem>> {
    if (options.filter === 'offline') {
      if (!options.deviceId) return { items: [], nextCursor: null, total: 0 };
      const downloads = await this.prisma.download.findMany({
        where: { userId, deviceId: options.deviceId, removedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      if (downloads.length === 0) return { items: [], nextCursor: null, total: 0 };

      const stories = await this.prisma.story.findMany({
        where: { id: { in: downloads.map((row) => row.storyId) }, status: 'PUBLISHED' },
        include: STORY_INCLUDE,
      });
      const byId = new Map(stories.map((story) => [story.id, story]));
      const [progressRows, reactionRows] = await Promise.all([
        this.prisma.readingProgress.findMany({
          where: { userId, storyId: { in: [...byId.keys()] } },
          select: { storyId: true, percent: true, completedAt: true },
        }),
        this.prisma.reaction.findMany({
          where: { userId, storyId: { in: [...byId.keys()] } },
          select: { storyId: true, type: true },
        }),
      ]);
      const progressByStory = new Map(progressRows.map((row) => [row.storyId, row]));
      const reactionByStory = new Map<string, ReactionType>(
        reactionRows.map((row) => [row.storyId, row.type]),
      );
      const items: SavedStoryItem[] = downloads.flatMap((download) => {
        const story = byId.get(download.storyId);
        if (!story) return [];
        const card = toStoryCard(story);
        const progress = progressByStory.get(story.id);
        const reaction = reactionByStory.get(story.id) ?? null;
        const progressPercent = progress?.percent ?? 0;
        return [
          {
            ...card,
            savedAt: download.createdAt.toISOString(),
            progressPercent,
            completed: Boolean(progress?.completedAt),
            reflection: reaction,
            ...(card.narrator ? { narrator: card.narrator } : {}),
            viewer: {
              saved: true,
              progressPercent,
              completed: Boolean(progress?.completedAt),
              reaction,
            },
          },
        ];
      });
      return { items, nextCursor: null, total: items.length };
    }

    const where: Prisma.SavedStoryWhereInput = { userId };
    if (options.filter === 'in-progress') {
      where.story = {
        progress: { some: { userId, percent: { gt: 0 }, completedAt: null } },
      };
    }

    // Total for the filter (not just this page) so the /saved header can show the real count.
    const total = await this.prisma.savedStory.count({ where });

    if (options.cursor) {
      const cursorDate = parseCursorDate(options.cursor.v);
      if (!cursorDate) throw this.invalidCursor();
      where.AND = [
        {
          OR: [
            { createdAt: { lt: cursorDate } },
            { createdAt: cursorDate, storyId: { lt: options.cursor.id } },
          ],
        },
      ];
    }

    const rows = await this.prisma.savedStory.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { storyId: 'desc' }],
      take: options.limit + 1,
      include: { story: { include: STORY_INCLUDE } },
    });

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    const storyIds = page.map((row) => row.storyId);

    const [progressRows, reactionRows] = await Promise.all([
      this.prisma.readingProgress.findMany({
        where: { userId, storyId: { in: storyIds } },
        select: { storyId: true, percent: true, completedAt: true },
      }),
      this.prisma.reaction.findMany({
        where: { userId, storyId: { in: storyIds } },
        select: { storyId: true, type: true },
      }),
    ]);

    const progressByStory = new Map(progressRows.map((row) => [row.storyId, row]));
    const reactionByStory = new Map<string, ReactionType>(
      reactionRows.map((row) => [row.storyId, row.type]),
    );

    const items: SavedStoryItem[] = page.map((row) => {
      const card = toStoryCard(row.story);
      const progress = progressByStory.get(row.storyId);
      const reaction = reactionByStory.get(row.storyId) ?? null;
      const progressPercent = progress?.percent ?? 0;
      const completed = progress?.completedAt !== null && progress?.completedAt !== undefined;

      return {
        ...card,
        savedAt: row.createdAt.toISOString(),
        progressPercent,
        completed,
        reflection: reaction,
        ...(card.narrator ? { narrator: card.narrator } : {}),
        viewer: {
          saved: true,
          progressPercent,
          completed,
          reaction,
        },
      };
    });

    const last = page.at(-1);
    const nextCursor =
      hasMore && last ? encodeCursor({ v: last.createdAt.toISOString(), id: last.storyId }) : null;

    return { items, nextCursor, total };
  }

  /** Idempotent save (plan 03 §2.7). */
  async save(userId: string, storyRef: string): Promise<OkResponse> {
    const story = await this.resolveStory(storyRef);
    await this.prisma.savedStory.upsert({
      where: { userId_storyId: { userId, storyId: story.id } },
      create: { userId, storyId: story.id },
      update: {},
    });
    return { ok: true };
  }

  /** Idempotent unsave: removing a story that is not saved still succeeds. */
  async unsave(userId: string, storyRef: string): Promise<OkResponse> {
    const story = await this.resolveStory(storyRef);
    await this.prisma.savedStory.deleteMany({ where: { userId, storyId: story.id } });
    return { ok: true };
  }

  private async resolveStory(storyRef: string): Promise<{ id: string }> {
    const story = await this.prisma.story.findFirst({
      where: publishedStoryWhere(storyRef),
      select: ACTIVITY_STORY_SELECT,
    });
    return assertStoryFound(story, storyRef);
  }

  private invalidCursor(): AppException {
    return new AppException(
      'VALIDATION_FAILED',
      400,
      'The pagination cursor is invalid.',
      [{ field: 'cursor', message: 'Invalid cursor.' }],
    );
  }
}
