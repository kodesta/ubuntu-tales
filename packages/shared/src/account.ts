import type {
  CommunityRole,
  ImageRef,
  NarratorSummary,
  Paginated,
  ReactionType,
  StoryCard,
  TribeSummary,
} from './domain';

/** Permissions role. Never derive this from `communityRole` (ADR-008). */
export type SystemRole = 'READER' | 'CONTRIBUTOR' | 'EDITOR' | 'ADMIN';

export interface UserStatsSummary {
  talesRead: number;
  tribesExplored: number;
  listeningMinutes: number;
  currentStreakDays: number;
}

export interface UserMe {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  avatar?: ImageRef;
  tribe?: TribeSummary;
  customLineage?: string;
  lineageLabel?: string;
  communityRole?: CommunityRole;
  systemRole: SystemRole;
  locale: string;
  onboarded: boolean;
  stats: UserStatsSummary;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserMe;
  /** Dev/staging convenience only — never returned when NODE_ENV=production. */
  devEmailToken?: string;
}

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  tribeId?: string;
  customLineage?: string;
  communityRole?: CommunityRole;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  confirmAge13Plus: boolean;
  consentLineagePersonalisation?: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface MePatchInput {
  displayName?: string;
  tribeId?: string | null;
  customLineage?: string | null;
  lineageLabel?: string | null;
  communityRole?: CommunityRole | null;
  locale?: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailResponse {
  user: UserMe;
}

export interface ForgotPasswordResponse {
  ok: true;
  /** Dev/staging convenience only — never returned when NODE_ENV=production. */
  devResetToken?: string;
}

export interface OkResponse {
  ok: true;
}

export interface SavedStoryItem extends StoryCard {
  savedAt: string;
  progressPercent: number;
  completed: boolean;
  reflection?: ReactionType | null;
  narrator?: NarratorSummary;
}

export interface ProgressInput {
  narrationId?: string;
  lastSentenceId?: string;
  audioPositionMs: number;
  /** 0–100. */
  percent: number;
  /** Capped server-side. */
  listenedDeltaSec: number;
  /** ISO 8601, used for last-write-wins. */
  clientUpdatedAt: string;
}

export interface ProgressState {
  storyId: string;
  percent: number;
  lastSentenceId?: string;
  completed: boolean;
  completedAt?: string;
  updatedAt: string;
}

export interface ProgressPutResponse {
  progress: ProgressState;
  stats: UserStatsSummary;
}

export interface CompleteResponse {
  progress: ProgressState;
  stats: UserStatsSummary;
  recommendations: StoryCard[];
}

export interface ContinueReadingItem {
  story: StoryCard;
  progress: ProgressState;
}

export interface ReactionSummary {
  storyId: string;
  total: number;
  counts: Record<ReactionType, number>;
  viewer?: ReactionType | null;
}

export interface ReactionSetResponse {
  reaction: ReactionType;
  summary: ReactionSummary;
}

export interface MySubmissionsPlaceholder {
  /** Reserved for Phase 4. Not implemented in this slice. */
  items: Paginated<never>['items'];
}
