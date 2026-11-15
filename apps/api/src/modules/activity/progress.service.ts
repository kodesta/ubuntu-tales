import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  CompleteResponse,
  ContinueReadingItem,
  Paginated,
  ProgressPutResponse,
} from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../../common/errors/app-exception';
import { encodeCursor, type CursorPayload } from '../../common/pagination/cursor';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { STORY_INCLUDE } from '../../catalogue/catalogue.include';
import { toStoryCard } from '../../catalogue/catalogue.mapper';
import { DEFAULT_EDITORIAL_TZ } from '../../catalogue/story-of-day';
import { StoriesService } from '../../catalogue/stories.service';
import { ViewerOverlayService } from '../../catalogue/viewer.service';
import { countDistinctTribes, toProgressState, toStatsSummary } from './activity.mapper';
import type { ProgressInputDto } from './activity.dto';
import {
  activityDayKey,
  capListenedDelta,
  clampPercent,
  COMPLETE_THRESHOLD_PERCENT,
  nextStreakDays,
  parseCursorDate,
  resolveTimezone,
  shouldAcceptWrite,
} from './progress.logic';
import {
  ACTIVITY_STORY_SELECT,
  assertStoryFound,
  publishedStoryWhere,
  type ActivityStory,
} from './story-ref';

export interface ProgressListOptions {
  limit: number;
  cursor?: CursorPayload;
}

/**
 * Reading/listening progress + gamification (production plan 03 §2.7, 05 §3.9, 08 §1).
 *
 * All writes are last-write-wins on the client clock, `listenedDeltaSec` is capped per call and by
 * real elapsed time, and completion/stat increments are idempotent (first completion only).
 */
@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly stories: StoriesService,
    private readonly viewer: ViewerOverlayService,
  ) {}

  async put(
    userId: string,
    storyRef: string,
    input: ProgressInputDto,
    timezoneHeader?: string,
  ): Promise<ProgressPutResponse> {
    const story = await this.resolveStory(storyRef);
    const clientUpdatedAt = new Date(input.clientUpdatedAt);
    if (Number.isNaN(clientUpdatedAt.getTime())) {
      throw this.validationError('clientUpdatedAt', 'clientUpdatedAt must be a valid ISO timestamp.');
    }

    const now = new Date();
    const timezone = resolveTimezone(
      timezoneHeader,
      this.config.get<string>('EDITORIAL_TZ') ?? DEFAULT_EDITORIAL_TZ,
    );
    const todayKey = activityDayKey(now, timezone);
    const percent = clampPercent(input.percent);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.readingProgress.findUnique({
        where: { userId_storyId: { userId, storyId: story.id } },
      });

      if (existing && !shouldAcceptWrite(existing.clientUpdatedAt, clientUpdatedAt)) {
        // Stale offline write: keep the newer stored state and do not move any counters.
        const stats = await this.ensureStats(tx, userId);
        return { progress: existing, stats };
      }

      const listenedDelta = capListenedDelta(
        input.listenedDeltaSec,
        existing?.updatedAt ?? null,
        now,
      );
      const completesNow = percent >= COMPLETE_THRESHOLD_PERCENT && existing?.completedAt == null;

      const base = await this.ensureStats(tx, userId);
      const row = existing
        ? await tx.readingProgress.update({
            where: { userId_storyId: { userId, storyId: story.id } },
            data: {
              narrationId: input.narrationId ?? existing.narrationId,
              lastSentenceId: input.lastSentenceId ?? existing.lastSentenceId,
              audioPositionMs: input.audioPositionMs,
              percent,
              clientUpdatedAt,
              ...(completesNow
                ? { completedAt: now, completionCount: { increment: 1 } }
                : {}),
            },
          })
        : await tx.readingProgress.create({
            data: {
              userId,
              storyId: story.id,
              narrationId: input.narrationId ?? null,
              lastSentenceId: input.lastSentenceId ?? null,
              audioPositionMs: input.audioPositionMs,
              percent,
              clientUpdatedAt,
              ...(completesNow ? { completedAt: now, completionCount: 1 } : {}),
            },
          });

      const streak = nextStreakDays(
        { currentStreakDays: base.currentStreakDays, lastActiveDay: base.lastActiveDay },
        todayKey,
      );

      const statsData: Prisma.UserStatsUpdateInput = {
        listeningSeconds: { increment: listenedDelta },
        currentStreakDays: streak,
        lastActiveDay: new Date(`${todayKey}T00:00:00.000Z`),
      };
      if (completesNow) {
        statsData.talesRead = { increment: 1 };
        statsData.tribesExplored = await this.recomputeTribesExplored(tx, userId);
      }

      const stats = await tx.userStats.update({ where: { userId }, data: statsData });
      return { progress: row, stats };
    });

    return {
      progress: toProgressState(result.progress),
      stats: toStatsSummary(result.stats),
    };
  }

  /** Idempotent completion: stats only move on the first completion of a story. */
  async complete(
    userId: string,
    storyRef: string,
    timezoneHeader?: string,
  ): Promise<CompleteResponse> {
    const story = await this.resolveStory(storyRef);
    const now = new Date();
    const timezone = resolveTimezone(
      timezoneHeader,
      this.config.get<string>('EDITORIAL_TZ') ?? DEFAULT_EDITORIAL_TZ,
    );
    const todayKey = activityDayKey(now, timezone);

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.readingProgress.findUnique({
        where: { userId_storyId: { userId, storyId: story.id } },
      });
      const alreadyCompleted = existing?.completedAt != null;
      const base = await this.ensureStats(tx, userId);

      const row = existing
        ? await tx.readingProgress.update({
            where: { userId_storyId: { userId, storyId: story.id } },
            data: {
              percent: 100,
              completedAt: existing.completedAt ?? now,
              completionCount: (existing.completionCount ?? 0) + (alreadyCompleted ? 0 : 1),
              clientUpdatedAt: now,
            },
          })
        : await tx.readingProgress.create({
            data: {
              userId,
              storyId: story.id,
              percent: 100,
              completedAt: now,
              completionCount: 1,
              clientUpdatedAt: now,
            },
          });

      const streak = nextStreakDays(
        { currentStreakDays: base.currentStreakDays, lastActiveDay: base.lastActiveDay },
        todayKey,
      );
      const statsData: Prisma.UserStatsUpdateInput = {
        currentStreakDays: streak,
        lastActiveDay: new Date(`${todayKey}T00:00:00.000Z`),
      };
      if (!alreadyCompleted) {
        statsData.talesRead = { increment: 1 };
        statsData.tribesExplored = await this.recomputeTribesExplored(tx, userId);
      }

      const stats = await tx.userStats.update({ where: { userId }, data: statsData });
      return { progress: row, stats };
    });

    const completedRows = await this.prisma.readingProgress.findMany({
      where: { userId, completedAt: { not: null } },
      select: { storyId: true },
    });
    const recommendations = await this.stories.getRecommendations(story.slug, {
      viewerId: userId,
      excludeStoryIds: completedRows.map((row) => row.storyId),
    });

    return {
      progress: toProgressState(result.progress),
      stats: toStatsSummary(result.stats),
      recommendations,
    };
  }

  /** Continue-reading list, most recently touched first (plan 03 §2.7). */
  async list(
    userId: string,
    options: ProgressListOptions,
  ): Promise<Paginated<ContinueReadingItem>> {
    const where: Prisma.ReadingProgressWhereInput = { userId, percent: { gt: 0 } };

    if (options.cursor) {
      const cursorDate = parseCursorDate(options.cursor.v);
      if (!cursorDate) throw this.invalidCursor();
      where.AND = [
        {
          OR: [
            { updatedAt: { lt: cursorDate } },
            { updatedAt: cursorDate, storyId: { lt: options.cursor.id } },
          ],
        },
      ];
    }

    const rows = await this.prisma.readingProgress.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { storyId: 'desc' }],
      take: options.limit + 1,
      include: { story: { include: STORY_INCLUDE } },
    });

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    const cards = page.map((row) => toStoryCard(row.story));
    const overlaid = await this.viewer.overlay(userId, cards);

    const items: ContinueReadingItem[] = page.map((row, index) => ({
      story: overlaid[index] ?? cards[index]!,
      progress: toProgressState(row),
    }));

    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeCursor({ v: last.updatedAt.toISOString(), id: last.storyId })
        : null;

    return { items, nextCursor };
  }

  // ───────────── Internals ─────────────

  private async resolveStory(storyRef: string): Promise<ActivityStory> {
    const story = await this.prisma.story.findFirst({
      where: publishedStoryWhere(storyRef),
      select: ACTIVITY_STORY_SELECT,
    });
    return assertStoryFound(story, storyRef);
  }

  private async ensureStats(tx: Prisma.TransactionClient, userId: string) {
    return tx.userStats.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  /** `talesRead` counts distinct completions; `tribesExplored` = completed tribes ∪ own tribe. */
  private async recomputeTribesExplored(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<number> {
    const [completedRows, user] = await Promise.all([
      tx.readingProgress.findMany({
        where: { userId, completedAt: { not: null } },
        select: { story: { select: { tribeId: true } } },
      }),
      tx.user.findUnique({ where: { id: userId }, select: { tribeId: true } }),
    ]);

    return countDistinctTribes(
      completedRows.map((row) => row.story.tribeId),
      user?.tribeId ?? null,
    );
  }

  private validationError(field: string, message: string): AppException {
    return new AppException('VALIDATION_FAILED', 400, message, [{ field, message }]);
  }

  private invalidCursor(): AppException {
    return this.validationError('cursor', 'The pagination cursor is invalid.');
  }
}
