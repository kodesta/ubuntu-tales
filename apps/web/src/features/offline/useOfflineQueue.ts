import { get, set, keys, del } from 'idb-keyval';
import { useEffect } from 'react';

import { api } from '@/lib/api';
import type { ProgressInput } from '@ubuntu-tales/shared';

const PREFIX = 'ut.outbox.';

export interface OutboxEntry {
  id: string;
  kind: 'progress';
  storyId: string;
  payload: ProgressInput;
  createdAt: string;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function enqueue(entry: OutboxEntry): Promise<void> {
  if (!hasIndexedDb()) return;
  await set(`${PREFIX}${entry.id}`, entry);
}

async function listOutbox(): Promise<OutboxEntry[]> {
  if (!hasIndexedDb()) return [];
  const allKeys = (await keys()) as string[];
  const entries: OutboxEntry[] = [];
  for (const key of allKeys) {
    if (typeof key !== 'string' || !key.startsWith(PREFIX)) continue;
    const entry = await get<OutboxEntry>(key);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

async function removeFromOutbox(id: string): Promise<void> {
  await del(`${PREFIX}${id}`);
}

/**
 * Replays queued progress writes when the browser comes back online (production plan 03 §3.8).
 * Server last-write-wins (`clientUpdatedAt`) makes replays idempotent per story.
 */
export async function flushOutbox(): Promise<number> {
  const entries = await listOutbox();
  let flushed = 0;
  for (const entry of entries) {
    try {
      if (entry.kind === 'progress') {
        await api.progress.put(entry.storyId, entry.payload);
      }
      await removeFromOutbox(entry.id);
      flushed += 1;
    } catch {
      // Keep it queued; the next online event retries.
    }
  }
  return flushed;
}

export function queueProgress(storyId: string, payload: ProgressInput): void {
  const entry: OutboxEntry = {
    id: `${storyId}-${Date.now()}`,
    kind: 'progress',
    storyId,
    payload,
    createdAt: new Date().toISOString(),
  };
  void enqueue(entry);
}

/** Flushes the outbox on mount, on reconnect and on Background Sync where available. */
export function useOfflineQueue(): void {
  useEffect(() => {
    void flushOutbox();
    const onOnline = () => void flushOutbox();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);
}

export { listOutbox };
