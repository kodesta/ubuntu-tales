import type {
  AudioRendition,
  AudioRenditionKey,
  NarrationDetail,
  NarrationSummary,
  SentenceTiming,
  SoundscapeSummary,
  TimingStatus,
} from '@ubuntu-tales/shared';
import { resolveMediaUrl } from '../common/http/media-url';
import type { NarratorRow } from './catalogue.mapper';
import { toNarratorSummary } from './catalogue.mapper';

/** Rows the narration mapper needs (mirrors the Prisma include in `catalogue.include.ts`). */
export interface NarrationRow {
  id: string;
  locale: string;
  durationMs: number | null;
  sentenceTimings: unknown;
  timingStatus: TimingStatus;
  isDefault: boolean;
  narrator: NarratorRow;
  audio: {
    renditions: { name: string; url: string; sizeBytes: number; durationMs: number | null }[];
  } | null;
  soundscape: {
    slug: string;
    name: string;
    audioUrl: string;
    defaultGain: number;
  } | null;
}

const RENDITION_ORDER: AudioRenditionKey[] = ['aac_64k', 'aac_128k', 'aac_96k'];

export function narrationRenditions(row: NarrationRow): AudioRendition[] {
  const renditions = row.audio?.renditions ?? [];
  return RENDITION_ORDER.flatMap((key) => {
    const match = renditions.find((rendition) => rendition.name === key);
    return match
      ? [{ rendition: key, url: resolveMediaUrl(match.url), sizeBytes: match.sizeBytes } satisfies AudioRendition]
      : [];
  });
}

export function soundscapeSummary(row: NarrationRow): SoundscapeSummary | undefined {
  if (!row.soundscape) return undefined;
  return {
    slug: row.soundscape.slug,
    name: row.soundscape.name,
    url: resolveMediaUrl(row.soundscape.audioUrl),
    defaultGain: row.soundscape.defaultGain,
  };
}

export function sentenceTimings(row: NarrationRow): SentenceTiming[] | undefined {
  if (!Array.isArray(row.sentenceTimings)) return undefined;
  const timings = row.sentenceTimings.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const candidate = entry as Partial<SentenceTiming>;
    if (
      typeof candidate.sentenceId !== 'string' ||
      typeof candidate.startMs !== 'number' ||
      typeof candidate.endMs !== 'number'
    ) {
      return [];
    }
    return [
      { sentenceId: candidate.sentenceId, startMs: candidate.startMs, endMs: candidate.endMs },
    ];
  });
  return timings.length > 0 ? timings : undefined;
}

export function toNarrationSummary(row: NarrationRow): NarrationSummary {
  const soundscape = soundscapeSummary(row);
  return {
    id: row.id,
    locale: row.locale,
    durationMs: row.durationMs ?? 0,
    narrator: toNarratorSummary(row.narrator),
    timingStatus: row.timingStatus,
    isDefault: row.isDefault,
    ...(soundscape ? { soundscape } : {}),
  };
}

export function toNarrationDetail(row: NarrationRow): NarrationDetail {
  const timings = sentenceTimings(row);
  return {
    ...toNarrationSummary(row),
    audio: narrationRenditions(row),
    ...(timings ? { sentenceTimings: timings } : {}),
  };
}

export function listenTimeMinutes(durationMs: number | null | undefined): number | undefined {
  if (!durationMs || durationMs <= 0) return undefined;
  return Math.max(1, Math.round(durationMs / 60_000));
}
