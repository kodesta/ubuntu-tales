import { Injectable } from '@nestjs/common';
import type {
  AdminMetricsOverview,
  AdminUserRow,
  AuditLogRow,
  FeatureFlagRow,
  ModerationActionInput,
  Paginated,
  SubmissionStatus,
  SubmissionSummary,
  SystemRole,
} from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SubmissionsService } from '../submissions/submissions.service';

const DEFAULT_FLAGS: FeatureFlagRow[] = [
  { key: 'public_signup', enabled: true, description: 'Allow new accounts to be created.', updatedAt: new Date().toISOString() },
  { key: 'submissions', enabled: true, description: 'Accept community story submissions.', updatedAt: new Date().toISOString() },
  { key: 'auto_align', enabled: false, description: 'Automatic narration timing alignment.', updatedAt: new Date().toISOString() },
];

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly submissions: SubmissionsService,
  ) {}

  async listUsers(q: string | undefined, limit: number): Promise<Paginated<AdminUserRow>> {
    const rows = await this.prisma.user.findMany({
      where: q
        ? { OR: [{ email: { contains: q, mode: 'insensitive' } }, { displayName: { contains: q, mode: 'insensitive' } }] }
        : undefined,
      include: { tribe: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
    });
    return {
      items: rows.map((row) => ({
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        systemRole: row.systemRole,
        status: row.status,
        ...(row.communityRole ? { communityRole: row.communityRole } : {}),
        emailVerified: Boolean(row.emailVerifiedAt),
        ...(row.tribe?.name ? { tribeName: row.tribe.name } : {}),
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: null,
    };
  }

  async updateUser(
    actor: AuthenticatedUser,
    id: string,
    input: { systemRole?: SystemRole; status?: 'ACTIVE' | 'SUSPENDED' | 'DELETED' },
  ): Promise<AdminUserRow> {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { tribe: { select: { name: true } } } });
    if (!existing) throw AppException.notFound('User');
    if (existing.id === actor.id && input.status && input.status !== 'ACTIVE') {
      throw AppException.validation('You cannot suspend your own account.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id },
        data: {
          ...(input.systemRole ? { systemRole: input.systemRole } : {}),
          ...(input.status ? { status: input.status } : {}),
          // Suspension must invalidate existing sessions immediately (production plan 04 §9).
          ...(input.status && input.status !== 'ACTIVE' ? { sessionVersion: { increment: 1 } } : {}),
        },
        include: { tribe: { select: { name: true } } },
      });
      if (input.status && input.status !== 'ACTIVE') {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await tx.auditLog.create({
        data: { actorId: actor.id, action: 'user.update', entity: 'User', entityId: id, metadata: { ...input } },
      });
      return row;
    });

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      systemRole: updated.systemRole,
      status: updated.status,
      ...(updated.communityRole ? { communityRole: updated.communityRole } : {}),
      emailVerified: Boolean(updated.emailVerifiedAt),
      ...(updated.tribe?.name ? { tribeName: updated.tribe.name } : {}),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async listFlags(): Promise<FeatureFlagRow[]> {
    const rows = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    if (rows.length === 0) {
      await this.prisma.featureFlag.createMany({ data: DEFAULT_FLAGS.map((flag) => ({ key: flag.key, enabled: flag.enabled, description: flag.description })) });
      return DEFAULT_FLAGS;
    }
    return rows.map((row) => ({
      key: row.key,
      enabled: row.enabled,
      ...(row.description ? { description: row.description } : {}),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async setFlag(key: string, enabled: boolean): Promise<FeatureFlagRow> {
    const row = await this.prisma.featureFlag.upsert({
      where: { key },
      create: { key, enabled },
      update: { enabled },
    });
    return { key: row.key, enabled: row.enabled, ...(row.description ? { description: row.description } : {}), updatedAt: row.updatedAt.toISOString() };
  }

  async auditLog(limit: number): Promise<Paginated<AuditLogRow>> {
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const actors = await this.prisma.user.findMany({
      where: { id: { in: rows.flatMap((row) => (row.actorId ? [row.actorId] : [])) } },
      select: { id: true, displayName: true },
    });
    const names = new Map(actors.map((actor) => [actor.id, actor.displayName]));
    return {
      items: rows.map((row) => ({
        id: row.id,
        ...(row.actorId && names.get(row.actorId) ? { actorName: names.get(row.actorId) } : {}),
        action: row.action,
        entity: row.entity,
        ...(row.entityId ? { entityId: row.entityId } : {}),
        createdAt: row.createdAt.toISOString(),
        ...(row.metadata ? { metadata: row.metadata as Record<string, unknown> } : {}),
      })),
      nextCursor: null,
    };
  }

  async metrics(): Promise<AdminMetricsOverview> {
    const since7 = new Date(Date.now() - 7 * 86_400_000);
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const [
      stories,
      published,
      draft,
      archived,
      tribes,
      narrations,
      users,
      newUsers,
      pendingSubmissions,
      approvedSubmissions,
      completions7,
      completions30,
      listening,
    ] = await Promise.all([
      this.prisma.story.count(),
      this.prisma.story.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.story.count({ where: { status: 'DRAFT' } }),
      this.prisma.story.count({ where: { status: 'ARCHIVED' } }),
      this.prisma.tribe.count({ where: { isActive: true } }),
      this.prisma.narration.count({ where: { isPublished: true } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { createdAt: { gte: since7 } } }),
      this.prisma.submission.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }),
      this.prisma.submission.count({ where: { status: 'APPROVED' } }),
      this.prisma.readingProgress.count({ where: { completedAt: { gte: since7 } } }),
      this.prisma.readingProgress.count({ where: { completedAt: { gte: since30 } } }),
      this.prisma.userStats.aggregate({ _sum: { listeningSeconds: true } }),
    ]);

    return {
      stories: { total: stories, published, draft, archived },
      tribes,
      narrations,
      users: { total: users, newLast7Days: newUsers },
      submissions: { pending: pendingSubmissions, approved: approvedSubmissions },
      completionsLast7Days: completions7,
      completionsLast30Days: completions30,
      listeningHoursLast7Days: Math.round(((listening._sum.listeningSeconds ?? 0) / 3600) * 10) / 10,
    };
  }

  // Delegates so the admin controller keeps one dependency for moderation routes.
  queueSubmissions(status: SubmissionStatus | undefined, limit: number, cursor?: string): Promise<Paginated<SubmissionSummary>> {
    return this.submissions.queue(status, limit, cursor);
  }
  claimSubmission(actor: AuthenticatedUser, id: string): Promise<SubmissionSummary> {
    return this.submissions.claim(actor, id);
  }
  requestSubmissionChanges(actor: AuthenticatedUser, id: string, input: ModerationActionInput): Promise<SubmissionSummary> {
    return this.submissions.requestChanges(actor, id, input);
  }
  approveSubmission(actor: AuthenticatedUser, id: string, input: ModerationActionInput): Promise<SubmissionSummary> {
    return this.submissions.approve(actor, id, input);
  }
  rejectSubmission(actor: AuthenticatedUser, id: string, input: ModerationActionInput): Promise<SubmissionSummary> {
    return this.submissions.reject(actor, id, input);
  }
}
