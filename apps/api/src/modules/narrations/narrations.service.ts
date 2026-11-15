import { Injectable } from '@nestjs/common';
import type { NarrationDetail } from '@ubuntu-tales/shared';
import { AppException } from '../../common/errors/app-exception';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { toNarrationDetail } from '../../catalogue/narration.mapper';

const NARRATION_INCLUDE = {
  narrator: true,
  soundscape: true,
  audio: { include: { renditions: true } },
} as const;

/** `GET /narrations/:id` — a playable narration with its renditions, timings and ambience. */
@Injectable()
export class NarrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(id: string): Promise<NarrationDetail> {
    const narration = await this.prisma.narration.findFirst({
      where: { id, isPublished: true },
      include: NARRATION_INCLUDE,
    });
    if (!narration) throw AppException.notFound('Narration');
    return toNarrationDetail(narration);
  }
}
