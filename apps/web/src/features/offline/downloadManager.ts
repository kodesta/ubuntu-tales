import type { OfflineBundle } from '@ubuntu-tales/shared';

import { api } from '@/lib/api';
import { getDeviceId } from '@/lib/device-id';

import { deleteBundle, getBundle, listBundles, MEDIA_CACHE, putBundle, type StoredBundle } from './db';

export type DownloadPhase = 'bundle' | 'cover' | 'audio' | 'recording' | 'done' | 'error';

export interface DownloadProgress {
  slug: string;
  phase: DownloadPhase;
  percent: number;
  message: string;
  bytes?: number;
}

function absolute(url: string): string {
  return new URL(url, window.location.origin).toString();
}

async function fetchToCache(url: string, cacheKey: string): Promise<number> {
  const cache = await caches.open(MEDIA_CACHE);
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  const copy = response.clone();
  const buffer = await copy.arrayBuffer();
  await cache.put(cacheKey, new Response(buffer, { headers: response.headers }));
  return buffer.byteLength;
}

/**
 * Downloads a tale for offline reading/listening: the bundle JSON goes to IndexedDB, the cover and
 * the chosen audio rendition go to Cache Storage, then the server records the device (plan 01 §4.4).
 */
export async function downloadStory(
  slug: string,
  options: { rendition?: 'aac_64k' | 'aac_128k'; onProgress?: (progress: DownloadProgress) => void } = {},
): Promise<StoredBundle> {
  const rendition = options.rendition ?? 'aac_64k';
  const report = (phase: DownloadPhase, percent: number, message: string, bytes?: number) =>
    options.onProgress?.({ slug, phase, percent, message, ...(bytes ? { bytes } : {}) });

  report('bundle', 5, 'Fetching the tale…');
  const bundle: OfflineBundle = await api.getOfflineBundle(slug, { rendition });

  const audio = bundle.narration?.audio.find((item) => item.rendition === rendition)
    ?? bundle.narration?.audio[0];
  if (!audio) throw new Error('This tale has no audio to download.');

  // Free the previous copy before writing a new one.
  const previous = await getBundle(slug);
  if (previous) await removeDownloadMedia(slug, previous);

  report('cover', 15, 'Saving the artwork…');
  // Cache keys must be http(s) URLs, so use a same-origin namespace rather than a scheme-like id.
  const coverCacheKey = `/offline-media/${slug}/cover`;
  const audioCacheKey = `/offline-media/${slug}/audio-${rendition}.m4a`;

  let bytes = 0;
  try {
    bytes += await fetchToCache(absolute(bundle.story.cover.url), coverCacheKey);
  } catch {
    // Covers are nice to have; audio and text are the contract.
  }

  report('audio', 25, 'Saving the narration…');
  const audioBytes = await fetchToCache(absolute(audio.url), audioCacheKey);
  bytes += audioBytes;

  try {
    await navigator.storage?.persist?.();
  } catch {
    // Persistence is a hint, not a requirement.
  }

  const record: StoredBundle = {
    bundle,
    savedAt: new Date().toISOString(),
    audioCacheKeys: [audioCacheKey],
    coverCacheKey,
    bytes,
  };
  await putBundle(slug, record);

  report('recording', 90, 'Marking it available offline…');
  try {
    await api.downloads.add(bundle.story.id, {
      deviceId: getDeviceId(),
      narrationId: bundle.narration?.id,
      rendition,
    });
  } catch {
    // Offline copy still works locally; the server record syncs on a later download attempt.
  }

  report('done', 100, 'Ready to read offline.');
  return record;
}

/** Serves a downloaded audio file from Cache Storage without the network. */
export async function offlineAudioUrl(slug: string, rendition: 'aac_64k' | 'aac_128k' = 'aac_64k'): Promise<string | null> {
  const record = await getBundle(slug);
  if (!record) return null;
  const cache = await caches.open(MEDIA_CACHE);
  const key = record.audioCacheKeys.find((entry) => entry.includes(rendition))
    ?? record.audioCacheKeys[0];
  if (!key) return null;
  if (!key) return null;
  const response = await cache.match(key);
  if (!response) return null;
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function removeDownloadMedia(slug: string, record: StoredBundle): Promise<void> {
  const cache = await caches.open(MEDIA_CACHE);
  for (const key of record.audioCacheKeys) await cache.delete(key);
  if (record.coverCacheKey) await cache.delete(record.coverCacheKey);
  void slug;
}

export async function removeDownload(slug: string): Promise<void> {
  const record = await deleteBundle(slug);
  if (record) {
    await removeDownloadMedia(slug, record);
    try {
      await api.downloads.remove(record.bundle.story.id, getDeviceId());
    } catch {
      // Server sync is best effort; the local copy is gone either way.
    }
  }
}

export async function isDownloaded(slug: string): Promise<boolean> {
  return (await getBundle(slug)) !== undefined;
}

export async function listDownloads(): Promise<{ slug: string; record: StoredBundle }[]> {
  return listBundles();
}

export async function storageUsage(): Promise<{ bytes: number; count: number }> {
  const items = await listBundles();
  return {
    bytes: items.reduce((total, item) => total + (item.record.bytes ?? 0), 0),
    count: items.length,
  };
}

/** Resolves the playable URL for a tale: cache first, network fallback (used by the player). */
export async function resolveAudioUrl(
  slug: string,
  rendition: 'aac_64k' | 'aac_128k',
  networkUrl: string,
): Promise<string> {
  const cached = await offlineAudioUrl(slug, rendition);
  return cached ?? networkUrl;
}
