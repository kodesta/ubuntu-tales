import type { ImageRef, NarratorSummary } from './domain';

/** Rendition keys from the production plan (ADR-010). `aac_96k` is used for soundscapes. */
export type AudioRenditionKey = 'aac_64k' | 'aac_128k' | 'aac_96k';

export interface AudioRendition {
  rendition: AudioRenditionKey;
  url: string;
  sizeBytes: number;
}

export interface SentenceTiming {
  sentenceId: string;
  startMs: number;
  endMs: number;
}

export type TimingStatus = 'NONE' | 'AUTO' | 'VERIFIED';

export interface SoundscapeSummary {
  id?: string;
  slug: string;
  name: string;
  url: string;
  defaultGain: number;
}

export interface NarrationSummary {
  id: string;
  locale: string;
  durationMs: number;
  narrator: NarratorSummary;
  soundscape?: SoundscapeSummary;
  timingStatus: TimingStatus;
  isDefault?: boolean;
}

export interface NarrationDetail extends NarrationSummary {
  audio: AudioRendition[];
  sentenceTimings?: SentenceTiming[];
}

/** Offline bundle: everything the reader/player needs to work without the network. */
export interface OfflineBundle {
  story: import('./domain').StoryDetail;
  narration?: NarrationDetail;
  rendition: AudioRenditionKey;
  generatedAt: string;
}

/** Upload purposes and policy are defined in docs/production-plan/04 §4. */
export type MediaPurpose =
  | 'STORY_COVER'
  | 'TRIBE_IMAGE'
  | 'TRIBE_MASK'
  | 'NARRATOR_AVATAR'
  | 'USER_AVATAR'
  | 'NARRATION_AUDIO'
  | 'SOUNDSCAPE_AUDIO'
  | 'SUBMISSION_COVER'
  | 'SUBMISSION_AUDIO';

export type MediaKind = 'IMAGE' | 'AUDIO';
export type MediaStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'READY' | 'FAILED' | 'QUARANTINED';

export interface UploadRequest {
  purpose: MediaPurpose;
  contentType: string;
  sizeBytes: number;
  filename: string;
}

export interface UploadTicket {
  assetId: string;
  /** Root-relative URL the browser must PUT the raw file to. */
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: string;
}

export interface MediaAssetSummary {
  id: string;
  kind: MediaKind;
  purpose: MediaPurpose;
  status: MediaStatus;
  /** READY image: primary rendition or original. */
  image?: ImageRef;
  /** READY audio: playable renditions. */
  renditions?: AudioRendition[];
  durationMs?: number;
  failureReason?: string;
}

export interface DownloadRequest {
  deviceId: string;
  narrationId?: string;
  rendition?: AudioRenditionKey;
}

export interface DownloadRecord {
  storyId: string;
  deviceId: string;
  narrationId?: string;
  rendition: AudioRenditionKey;
  createdAt: string;
}
