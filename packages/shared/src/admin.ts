import type {
  AccessLevel,
  CategorySummary,
  CommunityRole,
  ImageRef,
  Region,
  StoryStatus,
} from './domain';
import type { SystemRole } from './account';
import type { StoryBody } from './story-body';
import type { TimingStatus } from './media';

/** Editorial state machine for community submissions (production plan 01 §4.5). */
export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface AdminStorySummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: StoryStatus;
  accessLevel: AccessLevel;
  isFeatured: boolean;
  tribe: { id: string; slug: string; name: string };
  category: CategorySummary;
  narrator?: { id: string; name: string };
  publishedAt?: string;
  updatedAt: string;
  wordCount: number;
  hasCover: boolean;
  hasAudio: boolean;
}

export interface AdminStoryDetail extends AdminStorySummary {
  body: StoryBody;
  moral?: string;
  regionLabel?: string;
  attribution?: string;
  cover?: ImageRef;
  coverAssetId?: string;
  tribeId: string;
  categoryId: string;
  narratorId?: string;
}

export interface StoryInput {
  title: string;
  summary: string;
  moral?: string;
  tribeId: string;
  categoryId: string;
  narratorId?: string;
  regionLabel?: string;
  attribution?: string;
  /** Plain paragraph strings; the server splits sentences and keeps stable ids on update. */
  paragraphs: string[];
  accessLevel?: AccessLevel;
  isFeatured?: boolean;
  coverAssetId?: string;
}

export interface AdminStoryListQuery {
  status?: StoryStatus;
  tribe?: string;
  category?: string;
  q?: string;
  limit?: number;
  cursor?: string;
}

export interface PublishResponse {
  story: AdminStorySummary;
  publishedAt: string;
}

export interface AdminMetricsOverview {
  stories: { total: number; published: number; draft: number; archived: number };
  tribes: number;
  narrations: number;
  users: { total: number; newLast7Days: number };
  submissions: { pending: number; approved: number };
  completionsLast7Days: number;
  completionsLast30Days: number;
  listeningHoursLast7Days: number;
}

export interface TribeInput {
  slug: string;
  name: string;
  region: Region;
  countries: string[];
  countriesLabel: string;
  tagline?: string;
  description?: string;
  accentColor: string;
  themeVariant?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CategoryInput {
  slug: string;
  name: string;
  badge: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface NarratorInput {
  slug: string;
  name: string;
  bio?: string;
  roleLabel?: string;
  accentColor?: string;
  avatarAssetId?: string;
}

export interface NarrationAdminSummary {
  id: string;
  storyId: string;
  storySlug: string;
  narrator: { id: string; name: string };
  locale: string;
  durationMs?: number;
  timingStatus: TimingStatus;
  isDefault: boolean;
  isPublished: boolean;
  sentenceCount: number;
}

export interface AttachNarrationInput {
  narratorId: string;
  audioAssetId: string;
  locale?: string;
  soundscapeId?: string;
  sentenceTimings?: { sentenceId: string; startMs: number; endMs: number }[];
  timingStatus?: TimingStatus;
  isDefault?: boolean;
  isPublished?: boolean;
}

export interface UpdateNarrationInput {
  sentenceTimings?: { sentenceId: string; startMs: number; endMs: number }[];
  timingStatus?: TimingStatus;
  isDefault?: boolean;
  isPublished?: boolean;
  soundscapeId?: string | null;
}

export interface StoryOfDayEntry {
  date: string;
  storyId: string;
  storySlug: string;
  title: string;
}

export interface SubmissionSummary {
  id: string;
  status: SubmissionStatus;
  title: string;
  author: { id: string; displayName: string };
  tribeName?: string;
  customTribe?: string;
  categoryName?: string;
  wordCount: number;
  submittedAt?: string;
  updatedAt: string;
  reviewerNote?: string;
  storySlug?: string;
}

export interface SubmissionDetail extends SubmissionSummary {
  bodyText: string;
  moral?: string;
  attribution?: string;
  rightsConfirmed: boolean;
  licence: string;
  coverUrl?: string;
  audioUrl?: string;
  events: {
    fromStatus?: SubmissionStatus;
    toStatus: SubmissionStatus;
    note?: string;
    at: string;
    actor?: string;
  }[];
}

export interface SubmissionInput {
  title: string;
  bodyText: string;
  moral?: string;
  tribeId?: string;
  customTribe?: string;
  categoryId?: string;
  attribution?: string;
  coverAssetId?: string;
  audioAssetId?: string;
  rightsConfirmed: boolean;
}

export interface ModerationActionInput {
  note?: string;
}

export interface FeatureFlagRow {
  key: string;
  enabled: boolean;
  description?: string;
  updatedAt: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  systemRole: SystemRole;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  communityRole?: CommunityRole;
  emailVerified: boolean;
  tribeName?: string;
  createdAt: string;
}

export interface AuditLogRow {
  id: string;
  actorName?: string;
  action: string;
  entity: string;
  entityId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
