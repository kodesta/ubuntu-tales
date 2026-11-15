import { Injectable } from '@nestjs/common';
import type {
  AdminStoryDetail,
  AdminStoryListQuery,
  AdminStorySummary,
  PublishResponse,
  StoryInput,
} from '@ubuntu-tales/shared';
import { countWords, readTimeMinutes } from '@ubuntu-tales/shared';
import { Prisma } from '@ubuntu-tales/db';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { STORY_INCLUDE } from '../../catalogue/catalogue.include';
import { toAdminStorySummary } from './admin.mapper';
import { bodyFromParagraphs, mergeStoryBody } from './story-body.util';

const ADMIN_INCLUDE = {
  ...STORY_INCLUDE,
  narrations: { select: { id: true } },
} satisfies Prisma.StoryInclude;

function slugify(title: string, fallback: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

@Injectable()
export class AdminStoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminStoryListQuery): Promise<{ items: AdminStorySummary[]; nextCursor: string | null }> {
    const where: Prisma.StoryWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.tribe) where.tribe = { slug: query.tribe };
    if (query.category) where.category = { slug: query.category };
    if (query.q) where.OR = [{ title: { contains: query.q, mode: 'insensitive' } }, { summary: { contains: query.q, mode: 'insensitive' } }];

    const limit = Math.min(50, Math.max(1, query.limit ?? 20));
    const rows = await this.prisma.story.findMany({
      where,
      include: ADMIN_INCLUDE,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return { items: rows.map(toAdminStorySummary), nextCursor: null };
  }

  async get(id: string): Promise<AdminStoryDetail> {
    const row = await this.prisma.story.findUnique({ where: { id }, include: ADMIN_INCLUDE });
    if (!row) throw AppException.notFound('Story');
    return this.toDetail(row);
  }

  private toDetail(row: Prisma.StoryGetPayload<{ include: typeof ADMIN_INCLUDE }>): AdminStoryDetail {
    return {
      ...toAdminStorySummary(row),
      body: row.body as unknown as AdminStoryDetail['body'],
      ...(row.moral ? { moral: row.moral } : {}),
      ...(row.regionLabel ? { regionLabel: row.regionLabel } : {}),
      ...(row.attribution ? { attribution: row.attribution } : {}),
      ...(row.coverUrl
        ? {
            cover: {
              url: row.coverUrl,
              alt: row.coverAlt,
              accent: row.coverAccent,
              width: 1200,
              height: 800,
            },
          }
        : {}),
      tribeId: row.tribeId,
      categoryId: row.categoryId,
      ...(row.narratorId ? { narratorId: row.narratorId } : {}),
    };
  }

  async create(input: StoryInput, actorId: string): Promise<AdminStoryDetail> {
    const [tribe, category, narrator] = await Promise.all([
      this.prisma.tribe.findUnique({ where: { id: input.tribeId } }),
      this.prisma.category.findUnique({ where: { id: input.categoryId } }),
      input.narratorId ? this.prisma.narrator.findUnique({ where: { id: input.narratorId } }) : null,
    ]);
    if (!tribe) throw AppException.validation('Unknown tribe.', [{ field: 'tribeId', message: 'Unknown tribe.' }]);
    if (!category) throw AppException.validation('Unknown category.', [{ field: 'categoryId', message: 'Unknown category.' }]);
    if (input.narratorId && !narrator) {
      throw AppException.validation('Unknown narrator.', [{ field: 'narratorId', message: 'Unknown narrator.' }]);
    }

    const body = bodyFromParagraphs(input.paragraphs);
    const slug = await this.uniqueSlug(slugify(input.title, `story-${Date.now()}`));
    const cover = input.coverAssetId ? await this.coverFromAsset(input.coverAssetId) : null;

    const created = await this.prisma.story.create({
      data: {
        slug,
        title: input.title,
        summary: input.summary,
        ...(input.moral ? { moral: input.moral } : {}),
        body: body as unknown as Prisma.InputJsonValue,
        wordCount: countWords(body),
        readTimeMinutes: readTimeMinutes(body),
        tribeId: input.tribeId,
        categoryId: input.categoryId,
        ...(input.narratorId ? { narratorId: input.narratorId } : {}),
        ...(input.regionLabel ? { regionLabel: input.regionLabel } : {}),
        ...(input.attribution ? { attribution: input.attribution } : {}),
        coverUrl: cover?.url ?? '',
        coverAlt: cover?.alt ?? input.title,
        coverAccent: cover?.accent ?? tribe.accentColor,
        status: 'DRAFT',
        accessLevel: input.accessLevel ?? 'FREE',
        isFeatured: input.isFeatured ?? false,
      },
      include: ADMIN_INCLUDE,
    });

    await this.audit(actorId, 'story.create', created.id, { title: created.title });
    return this.toDetail(created);
  }

  async update(id: string, input: Partial<StoryInput>, actorId: string): Promise<AdminStoryDetail> {
    const existing = await this.prisma.story.findUnique({ where: { id } });
    if (!existing) throw AppException.notFound('Story');

    const data: Prisma.StoryUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.summary !== undefined) data.summary = input.summary;
    if (input.moral !== undefined) data.moral = input.moral;
    if (input.regionLabel !== undefined) data.regionLabel = input.regionLabel;
    if (input.attribution !== undefined) data.attribution = input.attribution;
    if (input.accessLevel !== undefined) data.accessLevel = input.accessLevel;
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.tribeId !== undefined) data.tribe = { connect: { id: input.tribeId } };
    if (input.categoryId !== undefined) data.category = { connect: { id: input.categoryId } };
    if (input.narratorId !== undefined) {
      data.narrator = input.narratorId ? { connect: { id: input.narratorId } } : { disconnect: true };
    }

    if (input.paragraphs) {
      const body = mergeStoryBody(input.paragraphs, existing.body as unknown as AdminStoryDetail['body']);
      data.body = body as unknown as Prisma.InputJsonValue;
      data.wordCount = countWords(body);
      data.readTimeMinutes = readTimeMinutes(body);
    }
    if (input.coverAssetId) {
      const cover = await this.coverFromAsset(input.coverAssetId);
      data.coverUrl = cover.url;
      data.coverAlt = cover.alt;
      data.coverAccent = cover.accent;
    }

    const updated = await this.prisma.story.update({ where: { id }, data, include: ADMIN_INCLUDE });
    await this.audit(actorId, 'story.update', id, { fields: Object.keys(input) });
    return this.toDetail(updated);
  }

  async publish(id: string, actorId: string): Promise<PublishResponse> {
    const story = await this.prisma.story.findUnique({ where: { id }, include: { narrations: { select: { id: true } } } });
    if (!story) throw AppException.notFound('Story');
    if (!story.coverUrl) {
      throw AppException.validation('A published tale needs cover artwork.', [{ field: 'cover', message: 'Add cover artwork before publishing.' }]);
    }
    const body = story.body as unknown as AdminStoryDetail['body'];
    if (!body?.paragraphs?.length) {
      throw AppException.validation('A published tale needs a body.', [{ field: 'body', message: 'Add the story text before publishing.' }]);
    }

    const publishedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.story.update({
        where: { id },
        data: { status: 'PUBLISHED', publishedAt },
        include: ADMIN_INCLUDE,
      });
      await tx.storyRevision.create({
        data: {
          storyId: id,
          editorId: actorId,
          snapshot: {
            title: row.title,
            summary: row.summary,
            moral: row.moral,
            body: row.body as Prisma.InputJsonValue,
            tribeId: row.tribeId,
            categoryId: row.categoryId,
            publishedAt: publishedAt.toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      await this.recomputeTribeCount(tx, row.tribeId);
      return row;
    });

    await this.audit(actorId, 'story.publish', id, { publishedAt: publishedAt.toISOString() });
    return { story: toAdminStorySummary(updated), publishedAt: publishedAt.toISOString() };
  }

  async unpublish(id: string, actorId: string): Promise<PublishResponse> {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw AppException.notFound('Story');
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.story.update({ where: { id }, data: { status: 'DRAFT', publishedAt: null }, include: ADMIN_INCLUDE });
      await this.recomputeTribeCount(tx, row.tribeId);
      return row;
    });
    await this.audit(actorId, 'story.unpublish', id, {});
    return { story: toAdminStorySummary(updated), publishedAt: '' };
  }

  async archive(id: string, actorId: string): Promise<PublishResponse> {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw AppException.notFound('Story');
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.story.update({ where: { id }, data: { status: 'ARCHIVED' }, include: ADMIN_INCLUDE });
      await this.recomputeTribeCount(tx, row.tribeId);
      return row;
    });
    await this.audit(actorId, 'story.archive', id, {});
    return { story: toAdminStorySummary(updated), publishedAt: updated.publishedAt?.toISOString() ?? '' };
  }

  private async recomputeTribeCount(tx: Prisma.TransactionClient, tribeId: string): Promise<void> {
    const publishedStoryCount = await tx.story.count({ where: { tribeId, status: 'PUBLISHED' } });
    await tx.tribe.update({ where: { id: tribeId }, data: { publishedStoryCount } });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existing = await this.prisma.story.findUnique({ where: { slug: candidate } });
      if (!existing) return candidate;
      candidate = `${base}-${attempt + 2}`;
    }
    throw AppException.conflict('Could not allocate a unique slug.');
  }

  private async coverFromAsset(assetId: string): Promise<{ url: string; alt: string; accent: string }> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId }, include: { renditions: true } });
    if (!asset || asset.status !== 'READY') {
      throw AppException.validation('Cover artwork is not ready.', [{ field: 'coverAssetId', message: 'Upload the image first.' }]);
    }
    const rendition = asset.renditions.find((item) => item.name === 'w1280') ?? asset.renditions[0];
    if (!rendition) throw AppException.validation('Cover artwork has no renditions.', [{ field: 'coverAssetId', message: 'Upload the image again.' }]);
    return { url: rendition.url, alt: asset.originalName, accent: '#B4472C' };
  }

  private async audit(actorId: string, action: string, entityId: string, metadata: Record<string, unknown>): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorId, action, entity: 'Story', entityId, metadata: metadata as Prisma.InputJsonValue },
    });
  }
}
