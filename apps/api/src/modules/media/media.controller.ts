import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';
import type { MediaAssetSummary, UploadRequest, UploadTicket } from '@ubuntu-tales/shared';
import { z } from 'zod';
import { AppException } from '../../common/errors/app-exception';
import { CurrentUser } from '../../common/auth/auth.decorators';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { MediaService } from './media.service';

const uploadRequestSchema = z.object({
  purpose: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.coerce.number().int().positive(),
  filename: z.string().min(1).max(255),
});

@Controller('uploads')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /** `POST /uploads` — request a presigned-style upload ticket (production plan 03 §2.9). */
  @Post()
  ticket(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: unknown,
  ): Promise<UploadTicket> {
    const parsed = uploadRequestSchema.safeParse(body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));
      throw new AppException('VALIDATION_FAILED', 400, 'The upload request is invalid.', errors);
    }
    return this.media.createTicket(user, parsed.data as UploadRequest);
  }

  /**
   * `PUT /uploads/:assetId/content` — raw bytes, validation happens after the body is read.
   * The stream is consumed manually because the browser sends the file's real Content-Type.
   */
  @Put(':assetId/content')
  async content(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId') assetId: string,
    @Req() request: RawBodyRequest<FastifyRequest>,
  ): Promise<MediaAssetSummary> {
    const parsedBody = (request as unknown as { body?: unknown }).body;
    const toBuffer = (value: unknown): Buffer | null => {
      if (Buffer.isBuffer(value)) return value;
      if (value instanceof Uint8Array) return Buffer.from(value);
      return null;
    };
    const parsed = toBuffer(parsedBody);
    const buffer = parsed && parsed.length > 0 ? parsed : await readStream(request.raw, 320 * 1024 * 1024);
    return this.media.receiveContent(user, assetId, buffer);
  }

  @Post(':assetId/complete')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId') assetId: string,
  ): Promise<MediaAssetSummary> {
    return this.media.complete(user, assetId);
  }

  @Get(':assetId')
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('assetId') assetId: string,
  ): Promise<MediaAssetSummary> {
    return this.media.get(user, assetId);
  }
}

function readStream(stream: Readable, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    stream.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new AppException('UPLOAD_TOO_LARGE', 413, 'The uploaded file is too large.'));
        stream.destroy();
        return;
      }
      chunks.push(chunk);
    });
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
