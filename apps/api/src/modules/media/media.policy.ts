import type { MediaKind, MediaPurpose } from '@ubuntu-tales/shared';
import type { SystemRole } from '@ubuntu-tales/shared';

export interface UploadPolicy {
  kind: MediaKind;
  /** Minimum role required to request this purpose. */
  minRole: SystemRole;
  mimeTypes: string[];
  maxBytes: number;
}

const MB = 1024 * 1024;

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const AUDIO_MIMES = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/x-flac'];

/** Purpose → permissions, MIME types and size limits (adapted from production plan 04 §4). */
export const UPLOAD_POLICIES: Record<MediaPurpose, UploadPolicy> = {
  STORY_COVER: { kind: 'IMAGE', minRole: 'EDITOR', mimeTypes: IMAGE_MIMES, maxBytes: 12 * MB },
  TRIBE_IMAGE: { kind: 'IMAGE', minRole: 'EDITOR', mimeTypes: IMAGE_MIMES, maxBytes: 12 * MB },
  TRIBE_MASK: { kind: 'IMAGE', minRole: 'EDITOR', mimeTypes: IMAGE_MIMES, maxBytes: 12 * MB },
  NARRATOR_AVATAR: { kind: 'IMAGE', minRole: 'EDITOR', mimeTypes: IMAGE_MIMES, maxBytes: 6 * MB },
  USER_AVATAR: { kind: 'IMAGE', minRole: 'READER', mimeTypes: IMAGE_MIMES, maxBytes: 6 * MB },
  SUBMISSION_COVER: { kind: 'IMAGE', minRole: 'CONTRIBUTOR', mimeTypes: IMAGE_MIMES, maxBytes: 12 * MB },
  NARRATION_AUDIO: { kind: 'AUDIO', minRole: 'EDITOR', mimeTypes: AUDIO_MIMES, maxBytes: 300 * MB },
  SOUNDSCAPE_AUDIO: { kind: 'AUDIO', minRole: 'EDITOR', mimeTypes: AUDIO_MIMES, maxBytes: 100 * MB },
  SUBMISSION_AUDIO: { kind: 'AUDIO', minRole: 'CONTRIBUTOR', mimeTypes: AUDIO_MIMES, maxBytes: 100 * MB },
};

export const ROLE_RANK: Record<SystemRole, number> = {
  READER: 0,
  CONTRIBUTOR: 1,
  EDITOR: 2,
  ADMIN: 3,
};

export function roleAtLeast(role: SystemRole, required: SystemRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export function isMediaPurpose(value: string): value is MediaPurpose {
  return Object.prototype.hasOwnProperty.call(UPLOAD_POLICIES, value);
}

export const IMAGE_RENDITIONS: { name: string; width: number }[] = [
  { name: 'w320', width: 320 },
  { name: 'w640', width: 640 },
  { name: 'w1280', width: 1280 },
];

export const AVATAR_RENDITIONS: { name: string; size: number }[] = [
  { name: 'avatar_96', size: 96 },
  { name: 'avatar_256', size: 256 },
];

export const AUDIO_RENDITIONS: {
  name: 'aac_64k' | 'aac_128k' | 'aac_96k';
  bitrate: string;
  channels: number;
}[] = [
  { name: 'aac_64k', bitrate: '64k', channels: 1 },
  { name: 'aac_128k', bitrate: '128k', channels: 2 },
];

export const AUDIO_PROBE_LIMITS = { minMs: 10_000, maxMs: 60 * 60_000 };
