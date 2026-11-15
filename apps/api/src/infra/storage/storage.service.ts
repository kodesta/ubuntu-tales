import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

/**
 * Local-disk storage for media (Phase 3).
 *
 * The production plan targets RustFS/S3 (ADR-006); this slice keeps the same `StorageService`
 * surface against the local filesystem so the API can serve uploads and processed renditions
 * without external infrastructure. Swapping in S3 later means reimplementing this one class.
 *
 * Layout (all relative to MEDIA_ROOT):
 *   uploads/<assetId>/original<.ext>   – the verified original
 *   images/<assetId>/<rendition>.webp  – processed image renditions
 *   audio/<assetId>/<rendition>.m4a    – processed audio renditions
 *   narrations/<slug>/…                – seeded demo narration audio
 *   soundscapes/<slug>.m4a             – seeded ambience loops
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  readonly root: string;

  constructor(config: ConfigService) {
    const configured = config.get<string>('MEDIA_ROOT') ?? 'var/media';
    // Resolve against the repository root so `pnpm --filter api start` and tests agree.
    const repoRoot = path.resolve(__dirname, '../../../../..');
    this.root = path.isAbsolute(configured) ? configured : path.resolve(repoRoot, configured);
  }

  /** Absolute path for a storage key, refusing traversal outside MEDIA_ROOT. */
  resolve(key: string): string {
    const normalised = path.normalize(key).replace(/^([./\\])+/, '');
    const absolute = path.resolve(this.root, normalised);
    if (absolute !== this.root && !absolute.startsWith(`${this.root}${path.sep}`)) {
      throw new Error(`Refusing storage key outside MEDIA_ROOT: ${key}`);
    }
    return absolute;
  }

  /** Root-relative public URL for a key, e.g. `/media/images/x/w640.webp`. */
  publicUrl(key: string): string {
    const base = process.env.MEDIA_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? '';
    return `${base}/media/${key.split(path.sep).join('/')}`;
  }

  async write(key: string, data: Buffer | string): Promise<void> {
    const target = this.resolve(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data);
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async size(key: string): Promise<number> {
    const stats = await fs.stat(this.resolve(key));
    return stats.size;
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true, recursive: false });
  }

  async removeDir(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true, recursive: true });
  }

  ensureRoot(): void {
    // Boot-time only; the constructor is synchronous, so a sync mkdir is the right tool.
    fsSync.mkdirSync(this.root, { recursive: true });
    this.logger.log(`Media root: ${this.root}`);
  }
}
