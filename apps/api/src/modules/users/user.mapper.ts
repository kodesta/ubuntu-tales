import type {
  CommunityRole,
  SystemRole,
  UserMe,
  UserStatsSummary,
} from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { toTribeSummary, type TribeRow } from '../../catalogue/catalogue.mapper';

/** Everything needed to map a database user to the public `UserMe` DTO. */
export const USER_ME_INCLUDE = {
  tribe: true,
  stats: true,
} satisfies Prisma.UserInclude;

export interface UserStatsRow {
  talesRead: number;
  tribesExplored: number;
  listeningSeconds: number;
  currentStreakDays: number;
}

export interface UserRow {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string;
  customLineage: string | null;
  lineageLabel: string | null;
  communityRole: CommunityRole | null;
  systemRole: SystemRole;
  locale: string;
  onboardedAt: Date | null;
  createdAt: Date;
  tribe: TribeRow | null;
  stats: UserStatsRow | null;
}

/** `UserStatsSummary` for the profile/celebration cards; listening is rounded down to whole minutes. */
export function toUserStatsSummary(stats: UserStatsRow | null | undefined): UserStatsSummary {
  return {
    talesRead: stats?.talesRead ?? 0,
    tribesExplored: stats?.tribesExplored ?? 0,
    listeningMinutes: Math.floor((stats?.listeningSeconds ?? 0) / 60),
    currentStreakDays: stats?.currentStreakDays ?? 0,
  };
}

/**
 * Maps a user (+ tribe + stats) to `UserMe`. Avatar initials are rendered by the web app, so no
 * `avatar` image is emitted in this slice (plan 03 §2.3; uploads are deferred).
 */
export function toUserMe(row: UserRow): UserMe {
  return {
    id: row.id,
    email: row.email,
    emailVerified: row.emailVerifiedAt !== null,
    displayName: row.displayName,
    ...(row.tribe ? { tribe: toTribeSummary(row.tribe) } : {}),
    ...(row.customLineage ? { customLineage: row.customLineage } : {}),
    ...(row.lineageLabel ? { lineageLabel: row.lineageLabel } : {}),
    ...(row.communityRole ? { communityRole: row.communityRole } : {}),
    systemRole: row.systemRole,
    locale: row.locale,
    onboarded: row.onboardedAt !== null,
    stats: toUserStatsSummary(row.stats),
    createdAt: row.createdAt.toISOString(),
  };
}
