import { del, get, keys, set } from 'idb-keyval';
import type { OfflineBundle } from '@ubuntu-tales/shared';

const BUNDLE_PREFIX = 'ut.bundle.';
export const MEDIA_CACHE = 'offline-media-v1';

export interface StoredBundle {
  bundle: OfflineBundle;
  savedAt: string;
  /** Object URLs are recreated per session; the cache keys are the durable part. */
  audioCacheKeys: string[];
  coverCacheKey?: string;
  bytes: number;
}

function key(slug: string): string {
  return `${BUNDLE_PREFIX}${slug}`;
}

export async function putBundle(slug: string, record: StoredBundle): Promise<void> {
  await set(key(slug), record);
}

export async function getBundle(slug: string): Promise<StoredBundle | undefined> {
  return (await get<StoredBundle>(key(slug))) ?? undefined;
}

export async function listBundles(): Promise<{ slug: string; record: StoredBundle }[]> {
  const allKeys = (await keys()) as string[];
  const out: { slug: string; record: StoredBundle }[] = [];
  for (const entry of allKeys) {
    if (typeof entry !== 'string' || !entry.startsWith(BUNDLE_PREFIX)) continue;
    const record = await get<StoredBundle>(entry);
    if (record) out.push({ slug: entry.slice(BUNDLE_PREFIX.length), record });
  }
  return out;
}

export async function deleteBundle(slug: string): Promise<StoredBundle | undefined> {
  const record = await getBundle(slug);
  await del(key(slug));
  return record;
}

export async function clearBundles(): Promise<StoredBundle[]> {
  const records = (await listBundles()).map((item) => item.record);
  for (const item of await listBundles()) await del(key(item.slug));
  return records;
}
