import { Injectable } from '@nestjs/common';
import type { DownloadRequest, OkResponse } from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { publishedStoryWhere } from './story-ref';

const RENDITIONS = new Set(['aac_64k', 'aac_128k']);

/**
 * Per-device download records (production plan 03 §2.7, 01 §4.4). The media bytes live in the
 * browser's Cache Storage; the server only tracks which tales are available offline where, so the
 * "Offline" filter works across a reader's devices.
 */
@Injectable()
export class DownloadsService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, storyRef: string, input: DownloadRequest): Promise<OkResponse> {
    if (!input.deviceId || input.deviceId.length > 64) {
      throw AppException.validation('A device id is required.', [
        { field: 'deviceId', message: 'A device id is required.' },
      ]);
    }
    const rendition = input.rendition ?? 'aac_64k';
    if (!RENDITIONS.has(rendition)) {
      throw AppException.validation('Unknown audio rendition.', [
        { field: 'rendition', message: 'Use aac_64k or aac_128k.' },
      ]);
    }

    const story = await this.prisma.story.findFirst({
      where: publishedStoryWhere(storyRef),
      select: { id: true },
    });
    if (!story) throw AppException.notFound(`Story "${storyRef}"`);

    await this.prisma.download.upsert({
      where: {
        userId_storyId_deviceId: { userId, storyId: story.id, deviceId: input.deviceId },
      },
      create: {
        userId,
        storyId: story.id,
        deviceId: input.deviceId,
        narrationId: input.narrationId ?? null,
        rendition,
      },
      update: { removedAt: null, rendition, narrationId: input.narrationId ?? null },
    });
    return { ok: true };
  }

  async remove(userId: string, storyRef: string, deviceId?: string): Promise<OkResponse> {
    if (!deviceId) {
      throw AppException.validation('A device id is required.', [
        { field: 'deviceId', message: 'A device id is required.' },
      ]);
    }
    const story = await this.prisma.story.findFirst({
      where: publishedStoryWhere(storyRef),
      select: { id: true },
    });
    if (!story) throw AppException.notFound(`Story "${storyRef}"`);
    await this.prisma.download.updateMany({
      where: { userId, storyId: story.id, deviceId },
      data: { removedAt: new Date() },
    });
    return { ok: true };
  }
}
