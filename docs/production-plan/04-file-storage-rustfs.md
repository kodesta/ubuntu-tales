# 04 — File Storage with RustFS

RustFS is an S3-compatible object store written in Rust. Ubuntu Tales talks to it **only through the S3 API** using AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`). Swapping to AWS S3, Cloudflare R2, or MinIO must require only env-var changes (ADR-006).

> RustFS is a young project. Pin an exact image tag (never `latest`), and before relying on a feature (bucket policies, CORS, lifecycle rules, versioning, replication) verify it against the RustFS docs for that tag and cover it with an integration test in `packages/storage`. Where a feature is missing or unreliable, implement it in the app (e.g. cleanup jobs instead of lifecycle rules) — this doc already assumes that.

## 1. Buckets

| Bucket | Access | Contents | Retention |
| --- | --- | --- | --- |
| `ut-uploads` | Private | Raw files uploaded by browsers via presigned PUT | Originals kept 30 days after processing for re-processing; unfinished uploads deleted after 24 h (`maintenance.cleanupUploads` job) |
| `ut-media` | Public read (anonymous `s3:GetObject` only) | Processed renditions served to users via CDN | Kept while referenced; orphan sweep monthly |
| `ut-private` | Private | Narration masters (WAV/FLAC), data exports, future premium audio | Masters forever; exports 7 days |

Off-site backups go to a **different** provider (see §8), not to a bucket on the same cluster.

## 2. Object key scheme

```
ut-uploads/uploads/{purpose}/{yyyy}/{mm}/{assetId}/original.{ext}
ut-media/img/{assetId}/{variant}-{contentHash8}.{ext}        e.g. img/0192…/w640-3fa1b2c4.webp
ut-media/audio/{assetId}/{variant}-{contentHash8}.m4a        e.g. audio/0192…/aac_64k-9be1d0aa.m4a
ut-private/masters/narrations/{assetId}/master.{ext}
ut-private/exports/{userId}/{jobId}.zip
```

- Keys never contain user-supplied filenames (stored only in `MediaAsset.originalName`).
- Rendition keys include a content hash → objects are immutable → `Cache-Control: public, max-age=31536000, immutable` is set on PUT.
- Re-processing produces new keys; old renditions are deleted by the orphan sweep after 7 days.

## 3. Network layout and hostnames

| Hostname | Routes to | Purpose |
| --- | --- | --- |
| `media.ubuntutales.com` | Cloudflare CDN → Caddy → RustFS (`ut-media` only, GET/HEAD only) | Public playback and images; range requests pass through for audio seeking |
| `storage.ubuntutales.com` | Caddy → RustFS S3 endpoint (PUT only, presigned) | Browser direct uploads. Not cached by CDN; body size limit 300 MB |
| `rustfs:9000` (internal) | RustFS | API and worker server-side access |
| RustFS console | Internal network / VPN only | Never exposed publicly |

Because presigned URLs are signed for a specific host, the storage package holds **two S3 clients**:
- `internalClient` — endpoint `S3_INTERNAL_ENDPOINT` (`http://rustfs:9000`) for server-side get/put/head/delete.
- `presignClient` — endpoint `S3_PUBLIC_UPLOAD_ENDPOINT` (`https://storage.ubuntutales.com`) used only to generate presigned URLs.

Both use `forcePathStyle: true` and region `S3_REGION` (e.g. `us-east-1`; RustFS ignores it but the SDK requires one).

### Bucket CORS (`ut-uploads`)
Allow `PUT` from `https://ubuntutales.com`, `https://staging.ubuntutales.com`, and `http://localhost:5173`; allowed headers `content-type, x-amz-*`; expose `ETag`; max age 3600. If RustFS CORS is unavailable in the pinned version, Caddy sets the CORS headers on `storage.ubuntutales.com`.

## 4. Upload policy by purpose

Enforced by the API before issuing a presigned URL, and re-checked by the worker by sniffing magic bytes (`file-type` package) — never trust the declared `Content-Type`.

| Purpose | Who | Allowed types | Max size |
| --- | --- | --- | --- |
| `AVATAR` | any user | jpeg, png, webp | 5 MB |
| `SUBMISSION_IMAGE` | verified user | jpeg, png, webp | 10 MB |
| `SUBMISSION_AUDIO` | verified user | mp3, m4a, wav, ogg | 50 MB |
| `STORY_COVER`, `TRIBE_IMAGE`, `TRIBE_MASK`, `NARRATOR_AVATAR` | EDITOR+ | jpeg, png, webp | 15 MB |
| `NARRATION_AUDIO` | EDITOR+ | wav, flac, mp3, m4a | 300 MB |
| `SOUNDSCAPE_AUDIO` | EDITOR+ | wav, flac, mp3, m4a, ogg | 100 MB |

The presigned PUT is generated with `ContentType` and `ContentLength` bound into the signature so the browser cannot upload a different size or type. Expiry: 15 minutes.

## 5. Processing pipeline (worker)

### 5.1 Images — queue `media.image`
1. `GET` original from `ut-uploads`; sniff type; reject if not an allowed image or > 40 megapixels (decompression-bomb guard: `sharp({ limitInputPixels: 40_000_000 })`).
2. Auto-rotate by EXIF, then **strip all metadata** (removes GPS location).
3. Produce renditions:
   - `w320`, `w640`, `w1280` WebP (quality 78), never upscaled.
   - `og_1200x630` JPEG (cover crop, quality 82) — only for `STORY_COVER` and `TRIBE_IMAGE`.
   - `avatar_96`, `avatar_256` WebP square crop — only for avatars.
4. Compute `blurhash` from a 32 px thumbnail, store `width`, `height`.
5. `PUT` renditions to `ut-media` with immutable cache headers; insert `MediaRendition` rows; set asset `READY` in one transaction.

### 5.2 Audio — queue `media.audio`
1. `ffprobe` the original: must have exactly one audio stream, duration 10 s – 60 min. Otherwise `FAILED` with a reason.
2. For `NARRATION_AUDIO`: copy the original to `ut-private/masters/…` (lossless kept for future re-encodes).
3. Two-pass loudness normalisation to −16 LUFS integrated, −1.5 dBTP (`loudnorm` filter).
4. Encode:
   - `aac_64k` — AAC-LC, mono, 44.1 kHz, 64 kbps (data-saver, default for offline downloads).
   - `aac_128k` — AAC-LC, stereo, 44.1 kHz, 128 kbps.
   - Both with `-movflags +faststart` so playback starts before full download.
   - Soundscapes: single `aac_96k` rendition, trimmed for seamless loop.
5. Store `durationMs`; `PUT` renditions; mark `READY`.
6. If the asset is linked to a narration with `timingStatus = NONE` and the `auto_align` flag is on, enqueue `media.align` (phase 4).

### 5.3 Forced alignment — queue `media.align` (phase 4)
Worker posts `{ audioUrl (internal presigned GET), sentences: [{id, text}] , language }` to the `aligner` service (Python, WhisperX/aeneas). The service returns `{ sentenceId, startMs, endMs }[]`. Worker validates monotonic, non-overlapping timings covering ≥ 95% of sentences, then stores them with `timingStatus = AUTO`. Editors review and mark `VERIFIED` in the timing editor.

### 5.4 Job settings
- Attempts: 3 with exponential backoff (30 s, 2 min, 10 min). After the final failure the asset becomes `FAILED` and an admin notification is logged.
- Concurrency: images 4, audio 1 per worker (ffmpeg is CPU-bound), align 1.
- Temp files in a per-job directory under `/tmp/ut-worker`, always removed in `finally`.
- Large objects are streamed (`GetObjectCommand` body stream → ffmpeg stdin / temp file), never fully buffered in memory.

## 6. Serving media

- Public renditions: CDN URL `${MEDIA_PUBLIC_BASE_URL}/${key}` (`MEDIA_PUBLIC_BASE_URL=https://media.ubuntutales.com/ut-media`).
- Audio seeking relies on HTTP `Range` requests; verify in an integration test that RustFS returns `206 Partial Content` and that Caddy/Cloudflare preserve it.
- Private objects (exports, future premium audio): `presignGet` with 24 h expiry, generated by the internal client against the internal endpoint and served through the API (`302` redirect) — or through a dedicated host if volume demands.
- `EntitlementsService.canAccessMedia(user, asset)` is called before returning any URL for `PREMIUM` stories (always true in v1).

## 7. `packages/storage` API

```ts
export interface StorageService {
  presignPut(input: { bucket: Bucket; key: string; contentType: string; contentLength: number; expiresInSec?: number }): Promise<{ url: string; headers: Record<string, string> }>;
  presignGet(input: { bucket: Bucket; key: string; expiresInSec?: number; downloadName?: string }): Promise<string>;
  head(bucket: Bucket, key: string): Promise<{ sizeBytes: number; contentType?: string; etag: string } | null>;
  getStream(bucket: Bucket, key: string, range?: string): Promise<Readable>;
  put(input: { bucket: Bucket; key: string; body: Readable | Buffer; contentType: string; cacheControl?: string }): Promise<void>;
  copy(from: { bucket: Bucket; key: string }, to: { bucket: Bucket; key: string }): Promise<void>;
  delete(bucket: Bucket, key: string): Promise<void>;
  deleteMany(bucket: Bucket, keys: string[]): Promise<void>;
  publicUrl(key: string): string; // ut-media only
}
export type Bucket = 'uploads' | 'media' | 'private'; // mapped to real names via env
```

- Implemented with AWS SDK v3; `put` uses `@aws-sdk/lib-storage` `Upload` for multipart when > 16 MB.
- Integration tests run against a real RustFS container via Testcontainers (same pinned tag as production).

## 8. Environment variables

```
S3_INTERNAL_ENDPOINT=http://rustfs:9000
S3_PUBLIC_UPLOAD_ENDPOINT=http://localhost:9000        # https://storage.ubuntutales.com in prod
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=ut-app
S3_SECRET_ACCESS_KEY=change-me
S3_BUCKET_UPLOADS=ut-uploads
S3_BUCKET_MEDIA=ut-media
S3_BUCKET_PRIVATE=ut-private
MEDIA_PUBLIC_BASE_URL=http://localhost:9000/ut-media   # https://media.ubuntutales.com/ut-media in prod
```

The app uses a dedicated RustFS user (`ut-app`) scoped to the three buckets — never the root credentials. The worker and API may share it in v1; split into `ut-api` (presign + head + delete) and `ut-worker` (get/put) in phase 5.

## 9. Local development

`infra/compose/docker-compose.dev.yml` runs RustFS with a named volume, exposes `9000` (S3) and `9001` (console), and a one-shot `rustfs-init` container (AWS CLI image) that runs `infra/rustfs/bootstrap.sh`:

1. Create buckets `ut-uploads`, `ut-media`, `ut-private` (idempotent).
2. Apply anonymous read policy to `ut-media` (`infra/rustfs/policies/media-public-read.json`).
3. Apply CORS to `ut-uploads` (`infra/rustfs/cors/uploads.json`).
4. Create the `ut-app` user/access key if the RustFS admin API supports it in the pinned version; otherwise use the root key in **local dev only**.

## 10. Production topology, durability, backups

- **Start (launch):** RustFS on a 4-node cluster with erasure coding (tolerates 1 node / multiple disk failures), each node with dedicated data disks (XFS), on a private network. If budget forces a single node at launch, it must have RAID-1 disks and the off-site sync below must run at least hourly.
- **Off-site backup:** `rclone sync` (scheduled job in the worker host, or a Kubernetes CronJob) of `ut-media` and `ut-private` to an S3 bucket at a different provider/region (e.g. Backblaze B2 or Cloudflare R2) with object-lock/versioning enabled on the destination. `ut-uploads` is not backed up (transient).
- **Restore drill:** quarterly — restore a random sample of 100 objects and one full narration master, verify checksums against `MediaAsset.sha256`.
- **Monitoring:** scrape RustFS Prometheus metrics (if available in the pinned version) for disk usage, request errors, latency; alert at 75% capacity.
- **Capacity estimate:** 1,000 stories × (2 audio renditions ≈ 7 MB + master ≈ 60 MB + images ≈ 1 MB) ≈ 70 GB, plus submissions. Plan 500 GB usable for year one.
