import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactionSummary, ReactionType } from '@ubuntu-tales/shared';
import { REACTIONS } from '@ubuntu-tales/shared';
import { useCallback, useEffect } from 'react';

import { api } from '@/lib/api';
import { useIsAuthenticated, useSessionStore } from '@/stores/session';
import { useReactionsStore } from '@/stores/reactions';
import { useToastStore } from '@/stores/toast';

/**
 * Phase 2 reaction sync.
 *
 * Guests keep the original local-only behaviour (`ut.reactions`). Signed-in readers get the public
 * counts from `GET /stories/:id/reactions/summary`, an optimistic local mirror, and idempotent
 * `PUT`/`DELETE /stories/:id/reactions` writes with rollback on failure.
 */

const REACTION_TYPES: ReactionType[] = REACTIONS.map((reaction) => reaction.type);

/**
 * True while the current session has mirrored account reactions into `ut.reactions`, so a logout
 * can clear them on the next guest mount (shared-device privacy).
 */
let accountReactionsMirrored = false;

export const REACTION_SUMMARY_STALE_TIME = 30_000;

export const reactionSummaryQueryKey = (storyId: string | undefined) =>
  ['reaction-summary', storyId ?? ''] as const;

export function reactionSummaryQueryOptions(storyId: string | undefined) {
  return queryOptions({
    queryKey: reactionSummaryQueryKey(storyId),
    queryFn: ({ signal }) => api.reactions.summary(storyId as string, { signal }),
    enabled: Boolean(storyId),
    staleTime: REACTION_SUMMARY_STALE_TIME,
  });
}

/** Public summary for a tale (counts per emotion, plus the viewer's own reaction when signed in). */
export function useReactionSummary(storyId: string | undefined) {
  return useQuery(reactionSummaryQueryOptions(storyId));
}

function emptyCounts(): Record<ReactionType, number> {
  return REACTION_TYPES.reduce(
    (counts, type) => ({ ...counts, [type]: 0 }),
    {} as Record<ReactionType, number>,
  );
}

function withOptimisticReaction(
  summary: ReactionSummary | undefined,
  next: ReactionType | null,
  previous: ReactionType | null,
): ReactionSummary | undefined {
  if (!summary) return summary;
  const counts = { ...emptyCounts(), ...summary.counts };
  let total = summary.total;

  if (previous && previous !== next) {
    counts[previous] = Math.max(0, counts[previous] - 1);
    total = Math.max(0, total - 1);
  }
  if (next && next !== previous) {
    counts[next] += 1;
    total += 1;
  }

  return { ...summary, counts, total, viewer: next };
}

export interface StoryReactionOptions {
  storySlug: string;
  /** The story UUID from the API payload; needed to read/write account reactions. */
  storyId?: string;
  /** Viewer overlay from an authenticated response (`story.viewer.reaction`). */
  initialReaction?: ReactionType | null;
  /** Bypass the summary request (e.g. fixture-only surfaces such as the UI gallery). */
  trackSummary?: boolean;
}

export interface StoryReactionState {
  selected: ReactionType | undefined;
  summary: ReactionSummary | undefined;
  total: number;
  countFor: (type: ReactionType) => number;
  choose: (type: ReactionType) => void;
  clear: () => void;
}

/** Shared reaction state + optimistic API writes for `ReactionRow` and the celebration picker. */
export function useStoryReaction({
  storySlug,
  storyId,
  initialReaction = null,
  trackSummary = true,
}: StoryReactionOptions): StoryReactionState {
  const isAuthed = useIsAuthenticated();
  const selected = useReactionsStore((state) => state.bySlug[storySlug]);
  const summaryQuery = useReactionSummary(trackSummary ? storyId : undefined);
  const queryClient = useQueryClient();

  // Account selection from the viewer overlay (or the summary) seeds the local mirror once.
  useEffect(() => {
    if (!isAuthed) return;
    const local = useReactionsStore.getState().bySlug[storySlug];
    if (local !== undefined) return;
    const serverReaction = initialReaction ?? summaryQuery.data?.viewer ?? null;
    if (serverReaction) useReactionsStore.getState().setReaction(storySlug, serverReaction);
  }, [isAuthed, storySlug, initialReaction, summaryQuery.data?.viewer]);

  // A logout must not leave account reactions on a shared device; the first guest mount clears
  // whatever the signed-in session mirrored locally.
  useEffect(() => {
    if (isAuthed) return;
    if (!accountReactionsMirrored) return;
    accountReactionsMirrored = false;
    useReactionsStore.getState().reset();
  }, [isAuthed]);

  const choose = useCallback(
    (type: ReactionType) => {
      const previous = useReactionsStore.getState().bySlug[storySlug] ?? null;
      useReactionsStore.getState().setReaction(storySlug, type);

      void (async () => {
        // A tap during the boot refresh must not be mistaken for a guest reaction.
        if (useSessionStore.getState().status === 'unknown') {
          await useSessionStore.getState().boot();
        }
        if (useSessionStore.getState().status !== 'authenticated' || !storyId) return;

        accountReactionsMirrored = true;
        const key = reactionSummaryQueryKey(storyId);
        const previousSummary = queryClient.getQueryData<ReactionSummary>(key);
        queryClient.setQueryData<ReactionSummary | undefined>(key, (current) =>
          withOptimisticReaction(current, type, previous),
        );

        try {
          const response = await api.reactions.set(storyId, type);
          queryClient.setQueryData<ReactionSummary>(key, response.summary);
        } catch {
          if (previous) useReactionsStore.getState().setReaction(storySlug, previous);
          else useReactionsStore.getState().clearReaction(storySlug);
          queryClient.setQueryData<ReactionSummary | undefined>(key, previousSummary);
          useToastStore
            .getState()
            .show('We could not record that reaction. Please try again.');
        }
      })();
    },
    [queryClient, storyId, storySlug],
  );

  const clear = useCallback(() => {
    const previous = useReactionsStore.getState().bySlug[storySlug] ?? null;
    useReactionsStore.getState().clearReaction(storySlug);

    void (async () => {
      if (useSessionStore.getState().status === 'unknown') {
        await useSessionStore.getState().boot();
      }
      if (useSessionStore.getState().status !== 'authenticated' || !storyId) return;

      accountReactionsMirrored = true;
      const key = reactionSummaryQueryKey(storyId);
      const previousSummary = queryClient.getQueryData<ReactionSummary>(key);
      queryClient.setQueryData<ReactionSummary | undefined>(key, (current) =>
        withOptimisticReaction(current, null, previous),
      );

      try {
        const response = await api.reactions.remove(storyId);
        queryClient.setQueryData<ReactionSummary>(key, response.summary);
      } catch {
        if (previous) useReactionsStore.getState().setReaction(storySlug, previous);
        queryClient.setQueryData<ReactionSummary | undefined>(key, previousSummary);
        useToastStore.getState().show('We could not remove that reaction. Please try again.');
      }
    })();
  }, [queryClient, storyId, storySlug]);

  const summary = summaryQuery.data;
  const countFor = useCallback(
    (type: ReactionType) => summary?.counts?.[type] ?? 0,
    [summary],
  );

  return { selected, summary, total: summary?.total ?? 0, countFor, choose, clear };
}

/** Exposed for tests that reset module state between cases. */
export function __resetReactionSyncForTests(): void {
  accountReactionsMirrored = false;
}
