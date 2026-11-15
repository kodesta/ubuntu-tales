import type { MePatchInput, ProgressInput, UserMe } from '@ubuntu-tales/shared';

import { useReadingProgressStore } from '@/features/reader/readingProgress';
import { api } from '@/lib/api';
import { useSavedStore } from '@/stores/saved';
import { useTribeStore } from '@/stores/tribe';

/**
 * Guest → account merge (task-7, brief item 3; docs 06 §4).
 *
 * Before accounts, a reader could choose roots (`ut.tribe`), save tales (`ut.saved`) and build a
 * reading position (`ut.progress`) on the device. On the first successful sign-in/sign-up we move
 * that state into the account through the normal endpoints, then clear only what actually moved.
 * The merge is deliberately resilient: every write is independent, failures are counted and the
 * reader is told briefly. Failed items stay on the device so a later sign-in can retry them.
 */

export interface GuestTribeSnapshot {
  slug: string;
  name: string;
}

export interface GuestSavedSnapshot {
  storyId: string;
  slug: string;
}

export interface GuestProgressSnapshot {
  slug: string;
  percent: number;
  lastSentenceId?: string;
  updatedAt: string;
}

export interface GuestDataSources {
  tribe: GuestTribeSnapshot | null;
  saved: GuestSavedSnapshot[];
  progress: GuestProgressSnapshot[];
}

/**
 * The slice of the API the merge touches. Injectable so the helper can be unit-tested without
 * mocking the whole client; production uses the singleton below.
 */
export interface GuestMergeClient {
  getTribes: () => Promise<Array<{ id: string; slug: string }>>;
  getStory: (slug: string) => Promise<{ id: string }>;
  updateMe: (patch: MePatchInput) => Promise<UserMe>;
  completeOnboarding: () => Promise<UserMe>;
  saveStory: (storyId: string) => Promise<unknown>;
  putProgress: (storyId: string, input: ProgressInput) => Promise<unknown>;
  completeStory: (storyId: string) => Promise<unknown>;
}

export interface GuestMergeSummary {
  tribe: 'none' | 'merged' | 'kept' | 'failed';
  saved: { merged: number; failed: number };
  progress: { merged: number; failed: number };
}

export interface GuestMergeOptions {
  client?: GuestMergeClient;
  /** Defaults to reading the persisted guest stores. */
  sources?: GuestDataSources;
}

/** How many local reading positions we replay — the API is rate-limited and this is a first visit. */
const MAX_PROGRESS_MERGES = 20;

function defaultClient(): GuestMergeClient {
  return {
    getTribes: async () => api.getTribes(),
    getStory: async (slug) => api.getStory(slug),
    updateMe: (patch) => api.me.update(patch),
    completeOnboarding: () => api.me.completeOnboarding(),
    saveStory: (storyId) => api.saved.save(storyId),
    putProgress: (storyId, input) => api.progress.put(storyId, input),
    completeStory: (storyId) => api.progress.complete(storyId),
  };
}

/** Reads the current on-device state through the existing guest stores (single source of truth). */
export function readGuestSources(): GuestDataSources {
  const tribe = useTribeStore.getState();
  const entries = useSavedStore.getState().entries;
  const progressBySlug = useReadingProgressStore.getState().bySlug;

  return {
    tribe: tribe.slug ? { slug: tribe.slug, name: tribe.name ?? tribe.slug } : null,
    saved: entries.map((entry) => ({ storyId: entry.story.id, slug: entry.story.slug })),
    progress: Object.entries(progressBySlug)
      .map(([slug, value]) => ({
        slug,
        percent: value.percent,
        lastSentenceId: value.lastSentenceId,
        updatedAt: value.updatedAt,
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, MAX_PROGRESS_MERGES),
  };
}

export function hasGuestData(sources: GuestDataSources): boolean {
  return Boolean(sources.tribe) || sources.saved.length > 0 || sources.progress.length > 0;
}

function emptySummary(): GuestMergeSummary {
  return {
    tribe: 'none',
    saved: { merged: 0, failed: 0 },
    progress: { merged: 0, failed: 0 },
  };
}

/**
 * Moves on-device guest state into `user`'s account. Never throws: every step is guarded and
 * counted, so a flaky network cannot break the sign-in that just succeeded.
 */
export async function mergeGuestData(
  user: UserMe,
  options: GuestMergeOptions = {},
): Promise<GuestMergeSummary> {
  const sources = options.sources ?? readGuestSources();
  const summary = emptySummary();

  if (!hasGuestData(sources)) return summary;

  const client = options.client ?? defaultClient();

  // 1. Roots: only when the account does not already carry a publication.
  if (sources.tribe) {
    if (user.tribe) {
      // The account wins; the stale device choice would otherwise override the personalised feed.
      summary.tribe = 'kept';
      useTribeStore.getState().clearTribe();
    } else {
      try {
        const tribes = await client.getTribes();
        const match = tribes.find((tribe) => tribe.slug === sources.tribe?.slug);
        if (!match) {
          summary.tribe = 'failed';
        } else {
          await client.updateMe({ tribeId: match.id });
          summary.tribe = 'merged';
          useTribeStore.getState().clearTribe();
          if (!user.onboarded) {
            // Best-effort: the roots are already saved; the flag is a nicety.
            await client.completeOnboarding().catch(() => undefined);
          }
        }
      } catch {
        summary.tribe = 'failed';
      }
    }
  }

  // 2. Saved tales: idempotent PUT per story; clear the local snapshot only once it landed.
  for (const item of sources.saved) {
    try {
      await client.saveStory(item.storyId);
      summary.saved.merged += 1;
      // `unsave` is slug-keyed by the store's existing contract (web-personal keeps it stable).
      useSavedStore.getState().unsave(item.slug);
    } catch {
      summary.saved.failed += 1;
    }
  }

  // 3. Reading positions: resolve the slug to a story id (saved snapshots first, then GET /stories).
  const slugToId = new Map(sources.saved.map((entry) => [entry.slug, entry.storyId]));

  for (const entry of sources.progress) {
    try {
      let storyId = slugToId.get(entry.slug);
      if (!storyId) {
        const story = await client.getStory(entry.slug);
        storyId = story.id;
      }

      await client.putProgress(storyId, {
        percent: entry.percent,
        lastSentenceId: entry.lastSentenceId,
        audioPositionMs: 0,
        listenedDeltaSec: 0,
        clientUpdatedAt: entry.updatedAt,
      });
      summary.progress.merged += 1;
      useReadingProgressStore.getState().clear(entry.slug);

      // A locally finished tale becomes a completion so "tales read" is honest. Idempotent
      // server-side; failure here does not undo the position that was just saved.
      if (entry.percent >= 100) {
        await client.completeStory(storyId).catch(() => undefined);
      }
    } catch {
      summary.progress.failed += 1;
    }
  }

  return summary;
}

/** True when the merge wrote something the reader should hear about. */
export function describeGuestMerge(summary: GuestMergeSummary): string | null {
  const merged =
    (summary.tribe === 'merged' ? 1 : 0) + summary.saved.merged + summary.progress.merged;
  const failed =
    (summary.tribe === 'failed' ? 1 : 0) + summary.saved.failed + summary.progress.failed;

  if (merged === 0 && failed === 0) return null;
  if (merged === 0) {
    return "We couldn't move your on-device tales across just now. They are still saved on this device.";
  }

  if (failed > 0) {
    return `Most of your on-device tales are on your account now. ${failed} could not be moved and stay on this device.`;
  }

  const parts: string[] = [];
  if (summary.tribe === 'merged') parts.push('roots');
  if (summary.saved.merged > 0) parts.push('saved tales');
  if (summary.progress.merged > 0) parts.push('reading place');

  if (parts.length === 1) return `Your ${parts[0]} is now on your account.`;
  const last = parts[parts.length - 1];
  const leading = parts.slice(0, -1).join(', ');
  return `Your ${leading} and ${last} are now on your account.`;
}
