import type { AudioRendition, AudioRenditionKey } from '@ubuntu-tales/shared';

/**
 * Choose the narration rendition for this reader (production plan 06 §5.1):
 * data saver or a slow connection gets the 64 kbps mono encode, everyone else 128 kbps.
 * Falls back to whatever the narration actually offers.
 */
export function chooseRendition(
  renditions: AudioRendition[] | undefined,
  options: { saveData?: boolean; effectiveType?: string } = {},
): AudioRendition | undefined {
  if (!renditions || renditions.length === 0) return undefined;

  const byName = (key: AudioRenditionKey) => renditions.find((item) => item.rendition === key);

  const connection = (globalThis.navigator as { connection?: { saveData?: boolean; effectiveType?: string } } | undefined)?.connection;
  const saveData = options.saveData ?? connection?.saveData ?? false;
  const effectiveType = options.effectiveType ?? connection?.effectiveType ?? '4g';
  const slow = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';

  if (saveData || slow) return byName('aac_64k') ?? byName('aac_128k') ?? renditions[0];
  return byName('aac_128k') ?? byName('aac_64k') ?? renditions[0];
}

export const PLAYBACK_RATES = [0.75, 1, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export function nextRate(current: number): PlaybackRate {
  const index = PLAYBACK_RATES.indexOf(current as PlaybackRate);
  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length] ?? 1;
}

export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
