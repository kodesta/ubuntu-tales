import { Injectable } from '@nestjs/common';
import type { StoryCard } from '@ubuntu-tales/shared';
import { PrismaService } from '../infra/prisma/prisma.service';

/**
 * Per-viewer overlay for catalogue responses (production plan 05 §3.6): personalised `viewer` data is
 * computed per request and merged into the (cacheable) public payload — never cached.
 *
 * Guests get the exact same payload as Phase 1 (no `viewer` key). Authenticated callers get
 * `{ saved, progressPercent, completed, reaction }` on every `StoryCard`.
 */
@Injectable()
export class ViewerOverlayService {
  constructor(private readonly prisma: PrismaService) {}

  async overlay(
    userId: string | null | undefined,
    cards: readonly StoryCard[],
  ): Promise<StoryCard[]> {
    if (!userId || cards.length === 0) return [...cards];

    const storyIds = Array.from(new Set(cards.map((card) => card.id)));

    const [saved, progress, reactions] = await Promise.all([
      this.prisma.savedStory.findMany({
        where: { userId, storyId: { in: storyIds } },
        select: { storyId: true },
      }),
      this.prisma.readingProgress.findMany({
        where: { userId, storyId: { in: storyIds } },
        select: { storyId: true, percent: true, completedAt: true },
      }),
      this.prisma.reaction.findMany({
        where: { userId, storyId: { in: storyIds } },
        select: { storyId: true, type: true },
      }),
    ]);

    const savedIds = new Set(saved.map((row) => row.storyId));
    const progressByStory = new Map(progress.map((row) => [row.storyId, row]));
    const reactionByStory = new Map(reactions.map((row) => [row.storyId, row.type]));

    return cards.map((card) => {
      const storyProgress = progressByStory.get(card.id);
      return {
        ...card,
        viewer: {
          saved: savedIds.has(card.id),
          progressPercent: storyProgress?.percent ?? 0,
          completed: storyProgress?.completedAt !== null && storyProgress?.completedAt !== undefined,
          reaction: reactionByStory.get(card.id) ?? null,
        },
      };
    });
  }
}
