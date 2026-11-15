import { Injectable } from '@nestjs/common';
import type {
  ReactionSetResponse,
  ReactionSummary,
  ReactionType,
} from '@ubuntu-tales/shared';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { emptyReactionCounts, toReactionSummary, topReactionType } from './activity.mapper';
import {
  ACTIVITY_STORY_SELECT,
  assertStoryFound,
  publishedStoryWhere,
} from './story-ref';

/**
 * Story reactions (production plan 03 §2.7 — 5 fixed types, one reaction per reader per story).
 * The summary is public; `viewer` is added only for authenticated callers.
 */
@Injectable()
export class ReactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async set(userId: string, storyRef: string, type: ReactionType): Promise<ReactionSetResponse> {
    const story = await this.resolveStory(storyRef);
    await this.prisma.reaction.upsert({
      where: { userId_storyId: { userId, storyId: story.id } },
      create: { userId, storyId: story.id, type },
      update: { type },
    });
    return { reaction: type, summary: await this.buildSummary(story.id, userId) };
  }

  async remove(userId: string, storyRef: string): Promise<ReactionSetResponse> {
    const story = await this.resolveStory(storyRef);
    const existing = await this.prisma.reaction.findUnique({
      where: { userId_storyId: { userId, storyId: story.id } },
      select: { type: true },
    });
    await this.prisma.reaction.deleteMany({ where: { userId, storyId: story.id } });

    const summary = await this.buildSummary(story.id, userId);
    // `ReactionSetResponse.reaction` is a non-null ReactionType in the frozen contract. Removing an
    // existing reaction returns the type that was cleared; an idempotent no-op delete falls back to
    // the story's most-chosen type so the field stays meaningful and type-safe.
    return {
      reaction: existing?.type ?? topReactionType(summary.counts),
      summary,
    };
  }

  async summaryByRef(storyRef: string, viewerId?: string | null): Promise<ReactionSummary> {
    const story = await this.resolveStory(storyRef);
    return this.buildSummary(story.id, viewerId ?? null);
  }

  private async buildSummary(
    storyId: string,
    viewerId: string | null,
  ): Promise<ReactionSummary> {
    const [groups, viewer] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: ['type'],
        where: { storyId },
        _count: { _all: true },
      }),
      viewerId
        ? this.prisma.reaction.findUnique({
            where: { userId_storyId: { userId: viewerId, storyId } },
            select: { type: true },
          })
        : Promise.resolve(null),
    ]);

    const counts = emptyReactionCounts();
    for (const group of groups) {
      counts[group.type] = group._count._all;
    }

    // Guests get no `viewer` key at all; signed-in readers get null (none) or their ReactionType.
    return toReactionSummary(storyId, counts, viewerId ? (viewer?.type ?? null) : undefined);
  }

  private async resolveStory(storyRef: string): Promise<{ id: string }> {
    const story = await this.prisma.story.findFirst({
      where: publishedStoryWhere(storyRef),
      select: ACTIVITY_STORY_SELECT,
    });
    return assertStoryFound(story, storyRef);
  }
}
