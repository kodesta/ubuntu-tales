import type {
  ProgressState,
  ReactionSummary,
  ReactionType,
  UserStatsSummary,
} from '@ubuntu-tales/shared';
import { REACTIONS } from '@ubuntu-tales/shared';

/** Every reaction type starts at zero so `ReactionSummary.counts` is always complete. */
export const EMPTY_REACTION_COUNTS: Record<ReactionType, number> = REACTIONS.reduce(
  (counts, reaction) => ({ ...counts, [reaction.type]: 0 }),
  {} as Record<ReactionType, number>,
);

let cachedEmptyCounts: Record<ReactionType, number> | null = null;

/** A fresh zero-filled counts object (safe to mutate). */
export function emptyReactionCounts(): Record<ReactionType, number> {
  cachedEmptyCounts ??= { ...EMPTY_REACTION_COUNTS };
  return { ...cachedEmptyCounts };
}

export function toReactionSummary(
  storyId: string,
  countsByType: Partial<Record<ReactionType, number>>,
  viewer: ReactionType | null | undefined = undefined,
): ReactionSummary {
  const counts = emptyReactionCounts();
  let total = 0;
  for (const [type, count] of Object.entries(countsByType) as [ReactionType, number][]) {
    const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    counts[type] = safeCount;
    total += safeCount;
  }
  return { storyId, total, counts, ...(viewer !== undefined ? { viewer } : {}) };
}

/** Highest-count reaction type, used as the `reaction` field when clearing a non-existent reaction. */
export function topReactionType(counts: Record<ReactionType, number>): ReactionType {
  let best: ReactionType = 'JOY';
  let bestCount = -1;
  for (const [type, count] of Object.entries(counts) as [ReactionType, number][]) {
    const safeCount = Number.isFinite(count) ? count : 0;
    if (safeCount > bestCount) {
      best = type;
      bestCount = safeCount;
    }
  }
  return best;
}

export function toProgressState(row: {
  storyId: string;
  percent: number;
  lastSentenceId: string | null;
  completedAt: Date | null;
  updatedAt: Date;
}): ProgressState {
  return {
    storyId: row.storyId,
    percent: row.percent,
    ...(row.lastSentenceId ? { lastSentenceId: row.lastSentenceId } : {}),
    completed: row.completedAt !== null,
    ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {}),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toListeningMinutes(listeningSeconds: number): number {
  return Math.floor(Math.max(0, listeningSeconds) / 60);
}

export function toStatsSummary(row: {
  talesRead: number;
  tribesExplored: number;
  listeningSeconds: number;
  currentStreakDays: number;
}): UserStatsSummary {
  return {
    talesRead: row.talesRead,
    tribesExplored: row.tribesExplored,
    listeningMinutes: toListeningMinutes(row.listeningSeconds),
    currentStreakDays: row.currentStreakDays,
  };
}

/** Distinct completed tribes (plus the user's own tribe when set). */
export function countDistinctTribes(
  tribeIds: Iterable<string | null | undefined>,
  ownTribeId: string | null | undefined,
): number {
  const unique = new Set<string>();
  for (const tribeId of tribeIds) {
    if (tribeId) unique.add(tribeId);
  }
  if (ownTribeId) unique.add(ownTribeId);
  return unique.size;
}
