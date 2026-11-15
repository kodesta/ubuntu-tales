import { Injectable } from '@nestjs/common';
import type {
  AttachNarrationInput,
  NarrationAdminSummary,
  UpdateNarrationInput,
} from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { validateTimings } from './story-body.util';

const NARRATION_INCLUDE = {
  narrator: { select: { id: true, name: true } },
  story: { select: { id: true, slug: true, body: true } },
} as const;

@Injectable()
export class AdminNarrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storyId?: string): Promise<NarrationAdminSummary[]> {
    const rows = await this.prisma.narration.findMany({
      where: storyId ? { storyId } : undefined,
      include: NARRATION_INCLUDE,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });
    return rows.map((row) => this.toSummary(row));
  }

  async attach(storyId: string, input: AttachNarrationInput, actorId: string): Promise<NarrationAdminSummary> {
    const [story, narrator, asset] = await Promise.all([
      this.prisma.story.findUnique({ where: { id: storyId } }),
      this.prisma.narrator.findUnique({ where: { id: input.narratorId } }),
      this.prisma.mediaAsset.findUnique({ where: { id: input.audioAssetId }, include: { renditions: true } }),
    ]);
    if (!story) throw AppException.notFound('Story');
    if (!narrator) throw AppException.validation('Unknown narrator.', [{ field: 'narratorId', message: 'Unknown narrator.' }]);
    if (!asset || asset.status !== 'READY' || asset.kind !== 'AUDIO') {
      throw AppException.validation('The audio is not ready.', [{ field: 'audioAssetId', message: 'Upload the audio first.' }]);
    }
    if (input.sentenceTimings) {
      const sentenceIds = this.sentenceIds(story.body);
      const errors = validateTimings(input.sentenceTimings, sentenceIds);
      if (errors.length > 0) throw AppException.validation('The timings are invalid.', errors.map((message) => ({ field: 'sentenceTimings', message })));
    }

    const locale = input.locale ?? 'en';
    const created = await this.prisma.narration.create({
      data: {
        storyId,
        narratorId: input.narratorId,
        locale,
        audioAssetId: input.audioAssetId,
        durationMs: asset.durationMs,
        sentenceTimings: (input.sentenceTimings ?? undefined) as never,
        timingStatus: input.timingStatus ?? (input.sentenceTimings ? 'AUTO' : 'NONE'),
        isDefault: input.isDefault ?? true,
        isPublished: input.isPublished ?? false,
        ...(input.soundscapeId ? { soundscapeId: input.soundscapeId } : {}),
      },
      include: NARRATION_INCLUDE,
    });
    if (created.isDefault) await this.demoteOtherDefaults(storyId, locale, created.id);
    await this.audit(actorId, 'narration.attach', created.id, { storyId });
    return this.toSummary(created);
  }

  async update(id: string, input: UpdateNarrationInput, actorId: string): Promise<NarrationAdminSummary> {
    const existing = await this.prisma.narration.findUnique({
      where: { id },
      include: { story: { select: { id: true, body: true } } },
    });
    if (!existing) throw AppException.notFound('Narration');

    if (input.sentenceTimings) {
      const errors = validateTimings(input.sentenceTimings, this.sentenceIds(existing.story.body));
      if (errors.length > 0) throw AppException.validation('The timings are invalid.', errors.map((message) => ({ field: 'sentenceTimings', message })));
    }

    const updated = await this.prisma.narration.update({
      where: { id },
      data: {
        ...(input.sentenceTimings ? { sentenceTimings: input.sentenceTimings as never } : {}),
        ...(input.timingStatus ? { timingStatus: input.timingStatus } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        ...(input.soundscapeId !== undefined
          ? { soundscape: input.soundscapeId ? { connect: { id: input.soundscapeId } } : { disconnect: true } }
          : {}),
      },
      include: NARRATION_INCLUDE,
    });
    if (updated.isDefault) await this.demoteOtherDefaults(updated.storyId, updated.locale, updated.id);
    await this.audit(actorId, 'narration.update', id, { fields: Object.keys(input) });
    return this.toSummary(updated);
  }

  private sentenceIds(body: unknown): Set<string> {
    const parsed = body as { paragraphs?: { sentences?: { id: string }[] }[] };
    const ids = new Set<string>();
    for (const paragraph of parsed.paragraphs ?? []) {
      for (const sentence of paragraph.sentences ?? []) ids.add(sentence.id);
    }
    return ids;
  }

  private async demoteOtherDefaults(storyId: string, locale: string, keepId: string): Promise<void> {
    await this.prisma.narration.updateMany({
      where: { storyId, locale, id: { not: keepId } },
      data: { isDefault: false },
    });
  }

  private toSummary(row: {
    id: string;
    storyId: string;
    locale: string;
    durationMs: number | null;
    timingStatus: 'NONE' | 'AUTO' | 'VERIFIED';
    isDefault: boolean;
    isPublished: boolean;
    sentenceTimings: unknown;
    narrator: { id: string; name: string };
    story: { id: string; slug: string };
  }): NarrationAdminSummary {
    const timings = Array.isArray(row.sentenceTimings) ? row.sentenceTimings.length : 0;
    return {
      id: row.id,
      storyId: row.storyId,
      storySlug: row.story.slug,
      narrator: row.narrator,
      locale: row.locale,
      ...(row.durationMs ? { durationMs: row.durationMs } : {}),
      timingStatus: row.timingStatus,
      isDefault: row.isDefault,
      isPublished: row.isPublished,
      sentenceCount: timings,
    };
  }

  private async audit(actorId: string, action: string, entityId: string, metadata: Record<string, unknown>): Promise<void> {
    await this.prisma.auditLog.create({ data: { actorId, action, entity: 'Narration', entityId, metadata: metadata as never } });
  }
}
