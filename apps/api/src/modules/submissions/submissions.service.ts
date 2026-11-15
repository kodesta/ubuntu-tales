import { Injectable } from '@nestjs/common';
import type {
  ModerationActionInput,
  Paginated,
  SubmissionDetail,
  SubmissionInput,
  SubmissionStatus,
  SubmissionSummary,
} from '@ubuntu-tales/shared';
import { countWords, readTimeMinutes } from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../../common/errors/app-exception';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { toSubmissionDetail, toSubmissionSummary } from '../admin/admin.mapper';
import { bodyFromParagraphs } from '../admin/story-body.util';
import { assertTransition, isEditable, validateSubmissionText } from './submission.machine';

const SUBMISSION_INCLUDE = {
  author: { select: { id: true, displayName: true } },
  tribe: { select: { name: true } },
  category: { select: { name: true } },
  story: { select: { slug: true } },
  events: { orderBy: { createdAt: 'asc' } },
} as const satisfies Prisma.SubmissionInclude;

@Injectable()
export class SubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthenticatedUser, input: SubmissionInput): Promise<SubmissionDetail> {
    if (!user.emailVerified) {
      throw AppException.forbidden('Verify your email before submitting a tale.');
    }
    if (!input.rightsConfirmed) {
      throw AppException.validation('Confirm that you have the rights to share this tale.', [
        { field: 'rightsConfirmed', message: 'Rights confirmation is required.' },
      ]);
    }
    if (input.tribeId && input.customTribe) {
      throw AppException.validation('Choose a publication or describe a custom one, not both.', [
        { field: 'customTribe', message: 'Use either a publication or a custom tribe.' },
      ]);
    }

    const created = await this.prisma.submission.create({
      data: {
        authorId: user.id,
        title: input.title,
        bodyText: input.bodyText,
        ...(input.moral ? { moral: input.moral } : {}),
        ...(input.tribeId ? { tribeId: input.tribeId } : {}),
        ...(input.customTribe ? { customTribe: input.customTribe } : {}),
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.attribution ? { attribution: input.attribution } : {}),
        rightsConfirmed: input.rightsConfirmed,
      },
      include: SUBMISSION_INCLUDE,
    });

    // First submission upgrades a reader to contributor (production plan 03 §2.8).
    if (user.systemRole === 'READER') {
      await this.prisma.user.update({ where: { id: user.id }, data: { systemRole: 'CONTRIBUTOR' } });
    }
    return toSubmissionDetail(created);
  }

  async mine(userId: string, limit: number, cursor?: string): Promise<Paginated<SubmissionSummary>> {
    const rows = await this.prisma.submission.findMany({
      where: { authorId: userId },
      include: SUBMISSION_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((row) => toSubmissionSummary(row)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async get(user: AuthenticatedUser, id: string): Promise<SubmissionDetail> {
    const row = await this.prisma.submission.findUnique({ where: { id }, include: SUBMISSION_INCLUDE });
    // Non-owners get 404, never 403 — do not reveal that a submission exists (production plan 03 §2.8).
    if (!row) throw AppException.notFound('Submission');
    const privileged = user.systemRole === 'EDITOR' || user.systemRole === 'ADMIN';
    if (row.authorId !== user.id && !privileged) throw AppException.notFound('Submission');
    return toSubmissionDetail(row);
  }

  async update(user: AuthenticatedUser, id: string, input: Partial<SubmissionInput>): Promise<SubmissionDetail> {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row) throw AppException.notFound('Submission');
    if (row.authorId !== user.id) throw AppException.notFound('Submission');
    if (!isEditable(row.status)) {
      throw new AppException('SUBMISSION_INVALID_STATE', 409, 'This submission can no longer be edited.');
    }
    const updated = await this.prisma.submission.update({
      where: { id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.bodyText ? { bodyText: input.bodyText } : {}),
        ...(input.moral !== undefined ? { moral: input.moral } : {}),
        ...(input.tribeId !== undefined ? { tribeId: input.tribeId } : {}),
        ...(input.customTribe !== undefined ? { customTribe: input.customTribe } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.attribution !== undefined ? { attribution: input.attribution } : {}),
      },
      include: SUBMISSION_INCLUDE,
    });
    return toSubmissionDetail(updated);
  }

  async submit(user: AuthenticatedUser, id: string): Promise<SubmissionSummary> {
    const row = await this.findOwned(user, id);
    const error = assertTransition(row.status, 'SUBMITTED');
    if (error) throw new AppException('SUBMISSION_INVALID_STATE', 409, error);
    const textError = validateSubmissionText(row.bodyText);
    if (textError) throw AppException.validation(textError, [{ field: 'bodyText', message: textError }]);
    if (!row.rightsConfirmed) {
      throw AppException.validation('Confirm that you have the rights to share this tale.', [
        { field: 'rightsConfirmed', message: 'Rights confirmation is required.' },
      ]);
    }
    return this.transition(row.id, row.status, 'SUBMITTED', user.id, 'Submitted for review.');
  }

  async withdraw(user: AuthenticatedUser, id: string): Promise<SubmissionSummary> {
    const row = await this.findOwned(user, id);
    const error = assertTransition(row.status, 'WITHDRAWN');
    if (error) throw new AppException('SUBMISSION_INVALID_STATE', 409, error);
    return this.transition(row.id, row.status, 'WITHDRAWN', user.id, 'Withdrawn by the author.');
  }

  // ───────────── moderation (EDITOR+) ─────────────

  async queue(status: SubmissionStatus | undefined, limit: number, cursor?: string): Promise<Paginated<SubmissionSummary>> {
    const rows = await this.prisma.submission.findMany({
      where: status ? { status } : { status: { in: ['SUBMITTED', 'IN_REVIEW'] } },
      include: SUBMISSION_INCLUDE,
      orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((row) => toSubmissionSummary(row)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async claim(actor: AuthenticatedUser, id: string): Promise<SubmissionSummary> {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row) throw AppException.notFound('Submission');
    const error = assertTransition(row.status, 'IN_REVIEW');
    if (error) throw new AppException('SUBMISSION_INVALID_STATE', 409, error);
    await this.prisma.submission.update({ where: { id }, data: { reviewerId: actor.id } });
    return this.transition(id, row.status, 'IN_REVIEW', actor.id, 'Claimed for review.');
  }

  async requestChanges(actor: AuthenticatedUser, id: string, input: ModerationActionInput): Promise<SubmissionSummary> {
    return this.moderate(actor, id, 'CHANGES_REQUESTED', input.note ?? 'Changes requested by the editor.');
  }

  async reject(actor: AuthenticatedUser, id: string, input: ModerationActionInput): Promise<SubmissionSummary> {
    return this.moderate(actor, id, 'REJECTED', input.note ?? 'Not accepted for the archive.');
  }

  async approve(actor: AuthenticatedUser, id: string, input: ModerationActionInput = {}): Promise<SubmissionSummary> {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row) throw AppException.notFound('Submission');
    const error = assertTransition(row.status, 'APPROVED');
    if (error) throw new AppException('SUBMISSION_INVALID_STATE', 409, error);

    const body = bodyFromParagraphs(row.bodyText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean));
    const story = await this.prisma.story.create({
      data: {
        slug: `${row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70)}-${Date.now().toString(36)}`,
        title: row.title,
        summary: row.attribution ?? row.title,
        ...(row.moral ? { moral: row.moral } : {}),
        body: body as unknown as Prisma.InputJsonValue,
        wordCount: countWords(body),
        readTimeMinutes: readTimeMinutes(body),
        tribeId: row.tribeId ?? (await this.prisma.tribe.findFirstOrThrow({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })).id,
        categoryId: row.categoryId ?? (await this.prisma.category.findFirstOrThrow({ orderBy: { sortOrder: 'asc' } })).id,
        ...(row.attribution ? { attribution: row.attribution } : {}),
        coverUrl: row.coverUrl ?? '',
        coverAlt: row.title,
        coverAccent: '#B4472C',
        status: 'DRAFT',
        accessLevel: 'FREE',
        authorUserId: row.authorId,
      },
    });

    await this.prisma.submission.update({ where: { id }, data: { storyId: story.id, reviewerId: actor.id } });
    const summary = await this.transition(id, row.status, 'APPROVED', actor.id, input.note ?? 'Approved — a draft tale was created.');
    return summary;
  }

  private async moderate(actor: AuthenticatedUser, id: string, to: SubmissionStatus, note: string): Promise<SubmissionSummary> {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row) throw AppException.notFound('Submission');
    const error = assertTransition(row.status, to);
    if (error) throw new AppException('SUBMISSION_INVALID_STATE', 409, error);
    await this.prisma.submission.update({ where: { id }, data: { reviewerId: actor.id, reviewerNote: note } });
    return this.transition(id, row.status, to, actor.id, note);
  }

  private async transition(id: string, from: SubmissionStatus, to: SubmissionStatus, actorId: string, note: string): Promise<SubmissionSummary> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.submission.update({
        where: { id },
        data: {
          status: to,
          ...(to === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
          ...(to === 'PUBLISHED' ? { publishedAt: new Date() } : {}),
        },
        include: SUBMISSION_INCLUDE,
      });
      await tx.submissionEvent.create({ data: { submissionId: id, fromStatus: from, toStatus: to, actorId, note } });
      await tx.auditLog.create({ data: { actorId, action: `submission.${to.toLowerCase()}`, entity: 'Submission', entityId: id, metadata: { from, to } } });
      return row;
    });
    return toSubmissionSummary(updated);
  }

  private async findOwned(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.submission.findUnique({ where: { id } });
    if (!row || row.authorId !== user.id) throw AppException.notFound('Submission');
    return row;
  }
}
