import { Injectable, Logger } from '@nestjs/common';
import type {
  MediaAssetSummary,
  MediaPurpose,
  UploadRequest,
  UploadTicket,
} from '@ubuntu-tales/shared';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppException } from '../../common/errors/app-exception';
import { StorageService } from '../../infra/storage/storage.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MediaProcessor } from './media.processor';
import { UPLOAD_POLICIES, roleAtLeast, type UploadPolicy } from './media.policy';
import type { AuthenticatedUser } from '../../common/auth/auth.types';

/** How long an upload ticket may be used (production plan 04 §4). */
const TICKET_TTL_MS = 15 * 60_000;

function extensionFor(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
    'audio/ogg': '.ogg',
    'audio/flac': '.flac',
    'audio/x-flac': '.flac',
  };
  return map[contentType] ?? '.bin';
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly processor: MediaProcessor,
  ) {}

  private policyFor(purpose: string): UploadPolicy {
    const policy = UPLOAD_POLICIES[purpose as MediaPurpose];
    if (!policy) throw AppException.validation('Unknown upload purpose.', [{ field: 'purpose', message: 'Unknown upload purpose.' }]);
    return policy;
  }

  async createTicket(user: AuthenticatedUser, input: UploadRequest): Promise<UploadTicket> {
    const policy = this.policyFor(input.purpose);
    if (!roleAtLeast(user.systemRole, policy.minRole)) {
      throw AppException.forbidden('Your role cannot upload this kind of file.');
    }
    if (!policy.mimeTypes.includes(input.contentType)) {
      throw AppException.validation(`Allowed types: ${policy.mimeTypes.join(', ')}`, [
        { field: 'contentType', message: `Allowed types: ${policy.mimeTypes.join(', ')}` },
      ]);
    }
    if (input.sizeBytes > policy.maxBytes) {
      const message = `Maximum size is ${Math.round(policy.maxBytes / (1024 * 1024))} MB.`;
      throw AppException.validation(message, [{ field: 'sizeBytes', message }]);
    }
    if (input.sizeBytes <= 0) {
      throw AppException.validation('File is empty.', [{ field: 'sizeBytes', message: 'File is empty.' }]);
    }

    const id = randomUUID();
    const asset = await this.prisma.mediaAsset.create({
      data: {
        id,
        kind: policy.kind,
        purpose: input.purpose as MediaPurpose,
        status: 'PENDING_UPLOAD',
        storageKey: '',
        originalName: input.filename.slice(0, 255),
        contentType: input.contentType,
        sizeBytes: input.sizeBytes,
        uploadedById: user.id,
      },
    });

    return {
      assetId: asset.id,
      uploadUrl: `/api/v1/uploads/${asset.id}/content`,
      method: 'PUT',
      headers: { 'Content-Type': input.contentType },
      expiresAt: new Date(Date.now() + TICKET_TTL_MS).toISOString(),
    };
  }

  /** Stream the raw upload into storage; validates the declared size before processing. */
  async receiveContent(
    user: AuthenticatedUser,
    assetId: string,
    buffer: Buffer,
  ): Promise<MediaAssetSummary> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw AppException.notFound('Upload');
    if (asset.uploadedById !== user.id) throw AppException.forbidden('This upload is not yours.');
    if (asset.status !== 'PENDING_UPLOAD') {
      throw AppException.conflict('This upload was already received.');
    }
    if (buffer.length === 0) {
      throw AppException.validation('The uploaded file is empty.', [{ field: 'file', message: 'The uploaded file is empty.' }]);
    }
    if (buffer.length > asset.sizeBytes) {
      throw AppException.validation('Uploaded bytes exceed the declared size.', [
        { field: 'file', message: 'Uploaded bytes exceed the declared size.' },
      ]);
    }

    const policy = this.policyFor(asset.purpose);
    const sniffed = await this.processor.sniff(buffer);
    if (!sniffed || !policy.mimeTypes.includes(sniffed)) {
      throw AppException.validation('The file content does not match an allowed media type.', [
        { field: 'file', message: 'The file content does not match an allowed media type.' },
      ]);
    }

    const storageKey = path.posix.join(
      'uploads',
      asset.id,
      `original${extensionFor(sniffed)}`,
    );
    await this.storage.write(storageKey, buffer);
    await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: { storageKey, contentType: sniffed, sizeBytes: buffer.length },
    });

    return this.process(asset.id, buffer, sniffed);
  }

  /** Called after the bytes land: runs the image/audio pipeline and records renditions. */
  async process(
    assetId: string,
    buffer?: Buffer,
    contentType?: string,
  ): Promise<MediaAssetSummary> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: { renditions: true },
    });
    if (!asset) throw AppException.notFound('Upload');
    if (asset.status === 'READY') return this.toSummary(asset.id);

    await this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { status: 'PROCESSING' },
    });

    const policy = this.policyFor(asset.purpose);
    const bytes = buffer ?? (asset.storageKey ? await this.storage.read(asset.storageKey) : Buffer.alloc(0));

    try {
      if (policy.kind === 'IMAGE') {
        const processed = await this.processor.processImage(bytes, asset.purpose);
        for (const rendition of processed.renditions) {
          const key = path.posix.join('images', asset.id, `${rendition.name}.webp`);
          await this.storage.write(key, rendition.buffer);
          await this.prisma.mediaRendition.create({
            data: {
              assetId: asset.id,
              name: rendition.name,
              url: this.storage.publicUrl(key),
              mimeType: rendition.mimeType,
              width: rendition.width,
              height: rendition.height,
              sizeBytes: rendition.buffer.length,
            },
          });
        }
        await this.prisma.mediaAsset.update({
          where: { id: asset.id },
          data: {
            status: 'READY',
            width: processed.width,
            height: processed.height,
            failureReason: null,
          },
        });
      } else {
        const encoded = this.processor.encodeAudio(this.storage.resolve(asset.storageKey), path.join(this.storage.root, 'audio', asset.id));
        for (const rendition of encoded.renditions) {
          const key = path.posix.join('audio', asset.id, `${rendition.name}.m4a`);
          await this.storage.write(key, rendition.buffer);
          await this.prisma.mediaRendition.create({
            data: {
              assetId: asset.id,
              name: rendition.name,
              url: this.storage.publicUrl(key),
              mimeType: rendition.mimeType,
              sizeBytes: rendition.buffer.length,
              durationMs: rendition.durationMs,
            },
          });
        }
        await this.prisma.mediaAsset.update({
          where: { id: asset.id },
          data: { status: 'READY', durationMs: encoded.durationMs, failureReason: null },
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message.slice(0, 500) : 'Processing failed.';
      this.logger.warn(`Media ${assetId} failed: ${reason}`);
      await this.prisma.mediaAsset.update({
        where: { id: assetId },
        data: { status: 'FAILED', failureReason: reason },
      });
      throw AppException.validation(reason, [{ field: 'file', message: reason }]);
    }

    return this.toSummary(asset.id);
  }

  async get(user: AuthenticatedUser, assetId: string): Promise<MediaAssetSummary> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw AppException.notFound('Upload');
    const owner = asset.uploadedById === user.id;
    if (!owner && !roleAtLeast(user.systemRole, 'EDITOR')) {
      throw AppException.forbidden('This upload is not yours.');
    }
    return this.toSummary(asset.id);
  }

  async complete(user: AuthenticatedUser, assetId: string): Promise<MediaAssetSummary> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw AppException.notFound('Upload');
    if (asset.uploadedById !== user.id) throw AppException.forbidden('This upload is not yours.');
    if (!asset.storageKey) {
      throw AppException.validation('No object was uploaded for this asset.', [
        { field: 'file', message: 'No object was uploaded for this asset.' },
      ]);
    }
    return this.process(asset.id);
  }

  private async toSummary(assetId: string): Promise<MediaAssetSummary> {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: { renditions: true },
    });
    if (!asset) throw AppException.notFound('Upload');

    const summary: MediaAssetSummary = {
      id: asset.id,
      kind: asset.kind,
      purpose: asset.purpose,
      status: asset.status,
    };
    if (asset.status === 'READY') {
      const webp = [...asset.renditions].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
      if (asset.kind === 'IMAGE' && webp) {
        summary.image = {
          url: webp.url,
          srcset: asset.renditions
            .filter((rendition) => rendition.width)
            .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
            .map((rendition) => `${rendition.url} ${rendition.width}w`)
            .join(', '),
          width: webp.width ?? undefined,
          height: webp.height ?? undefined,
          alt: asset.originalName,
        };
      }
      if (asset.kind === 'AUDIO') {
        summary.renditions = asset.renditions.map((rendition) => ({
          rendition: rendition.name as 'aac_64k' | 'aac_128k' | 'aac_96k',
          url: rendition.url,
          sizeBytes: rendition.sizeBytes,
        }));
        if (asset.durationMs) summary.durationMs = asset.durationMs;
      }
    }
    if (asset.failureReason) summary.failureReason = asset.failureReason;
    return summary;
  }
}
