import { Body, Controller, Delete, HttpCode, Param, Post, Query } from '@nestjs/common';
import type { DownloadRequest, OkResponse } from '@ubuntu-tales/shared';
import { z } from 'zod';
import { CurrentUser } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AppException } from '../../common/errors/app-exception';
import { DownloadsService } from './downloads.service';

const downloadSchema = z.object({
  deviceId: z.string().min(1).max(64),
  narrationId: z.string().uuid().optional(),
  rendition: z.enum(['aac_64k', 'aac_128k']).optional(),
});

/** `POST/DELETE /me/downloads/:storyId` — offline availability per device (plan 03 §2.7). */
@Controller('me/downloads')
export class DownloadsController {
  constructor(private readonly downloads: DownloadsService) {}

  @Post(':storyId')
  @HttpCode(200)
  add(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
    @Body() body: unknown,
  ): Promise<OkResponse> {
    const parsed = downloadSchema.safeParse(body);
    if (!parsed.success) {
      throw AppException.validation(
        'The download request is invalid.',
        parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || 'body',
          message: issue.message,
        })),
      );
    }
    return this.downloads.add(user.id, storyId, parsed.data as DownloadRequest);
  }

  @Delete(':storyId')
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('storyId') storyId: string,
    @Query('deviceId') deviceId?: string,
  ): Promise<OkResponse> {
    return this.downloads.remove(user.id, storyId, deviceId);
  }
}
