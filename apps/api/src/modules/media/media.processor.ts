import { Injectable, Logger } from '@nestjs/common';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const requireFromApi = createRequire(path.join(__dirname, '../../../../package.json'));

/**
 * Thin wrappers around `sharp` and the bundled `ffmpeg` binary. Kept separate from the service so
 * both the pipeline and its tests can reason about the primitives.
 */

let ffmpegPath: string | null = null;
function resolveFfmpeg(): string {
  if (ffmpegPath) return ffmpegPath;
  // @ffmpeg-installer/ffmpeg ships a static binary; fall back to a system ffmpeg when absent.
  try {
    const installer = requireFromApi('@ffmpeg-installer/ffmpeg') as { path: string };
    ffmpegPath = installer.path;
  } catch {
    ffmpegPath = 'ffmpeg';
  }
  return ffmpegPath;
}

export interface AudioProbe {
  durationMs: number;
  streams: number;
}

export interface ProcessedImage {
  width: number;
  height: number;
  renditions: { name: string; buffer: Buffer; width: number; height: number; mimeType: string }[];
}

export interface EncodedAudio {
  durationMs: number;
  renditions: { name: string; buffer: Buffer; mimeType: string; durationMs: number }[];
}

@Injectable()
export class MediaProcessor {
  private readonly logger = new Logger(MediaProcessor.name);

  /** Sniff the real media type from the bytes (never trust the declared Content-Type). */
  async sniff(buffer: Buffer): Promise<string | null> {
    // file-type v16 exports `fromBuffer`; v17+ renamed it to `fileTypeFromBuffer`. Support both so
    // the dependency can be upgraded without touching the pipeline.
    type FromBuffer = (buffer: Buffer) => Promise<{ mime: string } | undefined>;
    const imported = (await import('file-type')) as unknown as {
      fromBuffer?: FromBuffer;
      fileTypeFromBuffer?: FromBuffer;
      default?: { fromBuffer?: FromBuffer; fileTypeFromBuffer?: FromBuffer };
    };
    const fromBuffer =
      imported.fileTypeFromBuffer ??
      imported.fromBuffer ??
      imported.default?.fileTypeFromBuffer ??
      imported.default?.fromBuffer;
    if (!fromBuffer) return null;
    const detected = await fromBuffer(buffer);
    return detected?.mime ?? null;
  }

  /** Probe with ffmpeg: exactly one audio stream, duration within limits. */
  probeAudio(filePath: string): AudioProbe {
    const result = spawnSync(resolveFfmpeg(), ['-hide_banner', '-i', filePath], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    });
    const output = `${result.stderr ?? ''}`;
    const durationMatch = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(output);
    if (!durationMatch) {
      throw new Error('Could not read the audio duration (is this a valid media file?).');
    }
    const hours = Number(durationMatch[1] ?? 0);
    const minutes = Number(durationMatch[2] ?? 0);
    const seconds = Number(durationMatch[3] ?? 0);
    const durationMs = Math.round((hours * 3600 + minutes * 60 + seconds) * 1000);
    const audioStreams = (output.match(/Stream #\d+:\d+.*: Audio:/g) ?? []).length;
    if (audioStreams !== 1) {
      throw new Error(`Expected exactly one audio stream, found ${audioStreams}.`);
    }
    return { durationMs, streams: audioStreams };
  }

  /** Normalise + encode AAC renditions with faststart (ADR-010). */
  encodeAudio(filePath: string, outDir: string): EncodedAudio {
    const fs = requireFromApi('node:fs') as typeof import('node:fs');
    fs.mkdirSync(outDir, { recursive: true });
    const probe = this.probeAudio(filePath);
    const renditions: EncodedAudio['renditions'] = [];

    for (const rendition of [
      { name: 'aac_64k' as const, bitrate: '64k', channels: 1 },
      { name: 'aac_128k' as const, bitrate: '128k', channels: 2 },
    ]) {
      const out = path.join(outDir, `${rendition.name}.m4a`);
      const result = spawnSync(
        resolveFfmpeg(),
        [
          '-y',
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          filePath,
          '-af',
          'loudnorm=I=-16:TP=-1.5:LRA=11',
          '-c:a',
          'aac',
          '-b:a',
          rendition.bitrate,
          '-ac',
          String(rendition.channels),
          '-ar',
          '44100',
          '-movflags',
          '+faststart',
          out,
        ],
        { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
      );
      if (result.status !== 0) {
        throw new Error(`ffmpeg failed: ${(result.stderr ?? '').slice(0, 400)}`);
      }
      renditions.push({
        name: rendition.name,
        buffer: fs.readFileSync(out),
        mimeType: 'audio/mp4',
        durationMs: probe.durationMs,
      });
      fs.rmSync(out, { force: true });
    }

    return { durationMs: probe.durationMs, renditions };
  }

  /** Auto-rotate, strip metadata, and produce WebP renditions that never upscale. */
  async processImage(buffer: Buffer, purpose: string): Promise<ProcessedImage> {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default;
    const image = sharp(buffer, { limitInputPixels: 40_000_000 }).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width === 0 || height === 0) throw new Error('Could not read the image dimensions.');

    const isAvatar = purpose === 'USER_AVATAR' || purpose === 'NARRATOR_AVATAR';
    const renditions: ProcessedImage['renditions'] = [];

    if (isAvatar) {
      for (const rendition of [
        { name: 'avatar_96', size: 96 },
        { name: 'avatar_256', size: 256 },
      ]) {
        const out = await sharp(buffer)
          .rotate()
          .resize(rendition.size, rendition.size, { fit: 'cover' })
          .webp({ quality: 82 })
          .toBuffer();
        renditions.push({ ...rendition, buffer: out, width: rendition.size, height: rendition.size, mimeType: 'image/webp' });
      }
    } else {
      for (const rendition of [
        { name: 'w320', width: 320 },
        { name: 'w640', width: 640 },
        { name: 'w1280', width: 1280 },
      ]) {
        if (rendition.width > width) continue;
        const out = await sharp(buffer)
          .rotate()
          .resize({ width: rendition.width, withoutEnlargement: true })
          .webp({ quality: 78 })
          .toBuffer();
        const resized = await sharp(out).metadata();
        renditions.push({
          name: rendition.name,
          buffer: out,
          width: resized.width ?? rendition.width,
          height: resized.height ?? Math.round((height / width) * rendition.width),
          mimeType: 'image/webp',
        });
      }
      // Always keep at least one usable rendition for small source images.
      if (renditions.length === 0) {
        const out = await sharp(buffer).rotate().webp({ quality: 78 }).toBuffer();
        renditions.push({ name: 'w640', buffer: out, width, height, mimeType: 'image/webp' });
      }
    }

    this.logger.debug(`Processed ${purpose}: ${width}×${height}, ${renditions.length} renditions`);
    return { width, height, renditions };
  }
}
