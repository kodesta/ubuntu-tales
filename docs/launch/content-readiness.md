# Content readiness for launch (production plan 6.2)

## Current state

- **18 demo tales** across **16 publications** (Zulu and Yoruba have 2 each). Three flagship tales
  are long-form; the rest are 250–350 words.
- **7 griots** with role labels and bios.
- **34 original SVG artworks** (18 story covers, 16 publication marks).
- Demo narration for **6 tales** (local Piper TTS, real sentence timings).

## Launch thresholds

| Requirement | Threshold | Current | Gap |
| --- | --- | --- | --- |
| Published tales | ≥ 60 | 18 | 42 more |
| Publications with ≥ 5 tales | all active | 0 | 16 publications need content or `isActive=false` |
| Tales with a human narration | ≥ 30 | 0 (TTS only) | 30 recordings |
| Cultural review | every tale | not started | editorial process |
| Story of the Day scheduled | 60 days | 1 day | calendar fill |

## Editorial workflow

1. Write or retell a tale in `content/stories/<slug>.json` (see `content/README.md`).
2. Validate: `node tools/content-import.mjs ./incoming --dry-run` for new files, then
   `pnpm content:lint`.
3. Load into the database: `pnpm db:seed` (idempotent).
4. In the console, add cover artwork, attach the narration and times, review as a reader, publish.
5. Cultural reviewer signs off in the submission note or story revision.

## Recording narrations

Record at 44.1 kHz mono, ≥ 128 kbps, quiet room, consistent pace. Upload through
`POST /uploads` (purpose `NARRATION_AUDIO`), then attach with timings in the console. Until the
alignment service exists, use the timing editor workflow or import verified timings.

## Avoiding placeholder content

`pnpm content:lint` fails on lorem/TODO/TBD, stories under 120 words, missing covers, unknown
tribes/categories/narrators and duplicate slugs.
