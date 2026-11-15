#!/usr/bin/env node
/**
 * Generates demo narration audio + sentence timings with a local neural TTS (Piper), and three
 * ambience loops with ffmpeg. Assets are written under `var/media` (gitignored) and consumed by the
 * database seed. Production narration comes from human recordings (Phase 6.2).
 *
 * Prerequisites:
 *   python3 -m pip install --target=.tools/pylibs piper-tts
 *   PYTHONPATH=.tools/pylibs python3 -m piper.download_voices en_US-lessac-medium --data-dir .tools/piper-voices
 *   ffmpeg is provided by the @ffmpeg-installer/ffmpeg dev dependency.
 *
 * Usage: node tools/generate-narrations.mjs [slug ...]
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromApi = createRequire(path.join(ROOT, 'apps/api/package.json'));
const FFMPEG = requireFromApi('@ffmpeg-installer/ffmpeg').path;
const PIPER_MODEL = path.join(ROOT, '.tools/piper-voices/en_US-lessac-medium.onnx');
const PYTHON = process.env.PYTHON ?? 'python3';
const MEDIA_ROOT = path.join(ROOT, 'var/media');
const NARRATION_ROOT = path.join(MEDIA_ROOT, 'narrations');
const SOUNDSCAPE_ROOT = path.join(MEDIA_ROOT, 'soundscapes');
const GAP_MS = 220;
const LEAD_MS = 350;
const TAIL_MS = 650;

const DEFAULT_SLUGS = [
  'when-the-chameleon-carried-the-word',
  'ijapa-and-the-feast-above-the-clouds',
  'the-mantis-and-the-eland',
  'anansi-and-the-pot-of-wisdom',
  'unogwaja-and-the-lions-well',
  'the-acacia-and-the-herdsmans-promise',
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readWav(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Unsupported WAV output from Piper');
  }
  let offset = 12;
  let fmt;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      fmt = {
        channels: buffer.readUInt16LE(body + 2),
        sampleRate: buffer.readUInt32LE(body + 4),
        bits: buffer.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      if (!fmt) throw new Error('WAV data before fmt');
      if (fmt.bits !== 16) throw new Error(`Unsupported bit depth ${fmt.bits}`);
      return { ...fmt, data: buffer.subarray(body, body + size) };
    }
    offset = body + size + (size % 2);
  }
  throw new Error('WAV data chunk not found');
}

function writeWav(samples, sampleRate, channels) {
  const dataBytes = samples.length * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, samples]);
}

function synthSentence(text) {
  const result = spawnSync(
    PYTHON,
    ['-m', 'piper', '-m', PIPER_MODEL, '--output-raw'],
    {
      cwd: ROOT,
      input: text,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, PYTHONPATH: path.join(ROOT, '.tools/pylibs') },
    },
  );
  if (result.status !== 0) {
    throw new Error(`Piper failed: ${result.stderr?.toString().slice(0, 500)}`);
  }
  // --output-raw gives 22050 Hz mono s16le PCM directly.
  return result.stdout;
}

function pcmDurationMs(byteLength) {
  return Math.round((byteLength / 2 / 22050) * 1000);
}

function silence(ms) {
  return Buffer.alloc(Math.round((ms / 1000) * 22050) * 2);
}

function run(args) {
  const result = spawnSync(FFMPEG, args, { maxBuffer: 32 * 1024 * 1024 });
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed: ${result.args.join(' ')}\n${result.stderr?.toString().slice(0, 800)}`);
  }
}

function encode(masterWav, outPath, bitrate, channels) {
  run([
    '-y',
    '-i',
    masterWav,
    '-c:a',
    'aac',
    '-b:a',
    bitrate,
    '-ac',
    String(channels),
    '-ar',
    '44100',
    '-movflags',
    '+faststart',
    outPath,
  ]);
}

function generateNarration(manifest, slug) {
  const file = path.join(ROOT, 'content/stories', `${slug}.json`);
  if (!fs.existsSync(file)) throw new Error(`Unknown story ${slug}`);
  const story = JSON.parse(fs.readFileSync(file, 'utf8'));
  const workDir = path.join(NARRATION_ROOT, slug);
  ensureDir(workDir);

  const pcmParts = [silence(LEAD_MS)];
  const timings = [];
  let cursorMs = LEAD_MS;

  for (const paragraph of story.body.paragraphs) {
    for (const sentence of paragraph.sentences) {
      // Piper is more natural with a trailing full stop on fragments.
      const text = /[.!?…]$/.test(sentence.text.trim())
        ? sentence.text.trim()
        : `${sentence.text.trim()}.`;
      const pcm = synthSentence(text);
      const durationMs = pcmDurationMs(pcm.length);
      timings.push({
        sentenceId: sentence.id,
        startMs: cursorMs,
        endMs: cursorMs + durationMs,
      });
      pcmParts.push(pcm);
      cursorMs += durationMs;
      pcmParts.push(silence(GAP_MS));
      cursorMs += GAP_MS;
    }
  }
  pcmParts.push(silence(TAIL_MS));

  const sampleRate = 22050;
  const master = writeWav(Buffer.concat(pcmParts), sampleRate, 1);
  const masterPath = path.join(workDir, 'master.wav');
  fs.writeFileSync(masterPath, master);

  const aac64 = path.join(workDir, 'aac_64k.m4a');
  const aac128 = path.join(workDir, 'aac_128k.m4a');
  encode(masterPath, aac64, '64k', 1);
  encode(masterPath, aac128, '128k', 2);
  fs.rmSync(masterPath, { force: true });

  const entry = {
    storySlug: slug,
    narratorSlug: story.narratorSlug,
    locale: 'en',
    durationMs: cursorMs + TAIL_MS,
    timingStatus: 'VERIFIED',
    timings,
    renditions: {
      aac_64k: `/media/narrations/${slug}/aac_64k.m4a`,
      aac_128k: `/media/narrations/${slug}/aac_128k.m4a`,
    },
  };
  manifest.narrations.push(entry);
  console.log(`  ✓ ${slug} — ${(entry.durationMs / 60000).toFixed(1)} min, ${timings.length} sentences`);
}

function generateSoundscapes(manifest) {
  ensureDir(SOUNDSCAPE_ROOT);
  const loops = [
    {
      slug: 'savanna-night',
      name: 'Savanna night',
      gain: 0.22,
      filter: 'highpass=f=700,lowpass=f=5200',
      color: 'pink',
      amplitude: 0.35,
    },
    {
      slug: 'rain-on-the-roof',
      name: 'Rain on the roof',
      gain: 0.18,
      filter: 'highpass=f=300,lowpass=f=7000',
      color: 'white',
      amplitude: 0.22,
    },
    {
      slug: 'village-fire',
      name: 'Village fire',
      gain: 0.3,
      filter: 'lowpass=f=1800,highpass=f=60',
      color: 'brown',
      amplitude: 0.4,
    },
  ];
  for (const loop of loops) {
    const out = path.join(SOUNDSCAPE_ROOT, `${loop.slug}.m4a`);
    run([
      '-y',
      '-f',
      'lavfi',
      '-i',
      `anoisesrc=color=${loop.color}:amplitude=${loop.amplitude}:duration=30:sample_rate=44100`,
      '-af',
      `${loop.filter},afade=t=in:d=2,afade=t=out:st=28:d=2`,
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      '-ac',
      '2',
      '-movflags',
      '+faststart',
      out,
    ]);
    manifest.soundscapes.push({
      slug: loop.slug,
      name: loop.name,
      defaultGain: loop.gain,
      url: `/media/soundscapes/${loop.slug}.m4a`,
      durationSeconds: 30,
    });
    console.log(`  ✓ soundscape ${loop.slug}`);
  }
}

function main() {
  if (!fs.existsSync(PIPER_MODEL)) {
    console.error('Piper model missing. See the header of this script for prerequisites.');
    process.exit(1);
  }
  ensureDir(NARRATION_ROOT);
  const requested = process.argv.slice(2);
  const slugs = requested.length > 0 ? requested : DEFAULT_SLUGS;
  const manifestPath = path.join(NARRATION_ROOT, 'manifest.json');
  const manifest = { generatedAt: new Date().toISOString(), narrations: [], soundscapes: [] };

  console.log(`Generating narration audio for ${slugs.length} tale(s)…`);
  for (const slug of slugs) generateNarration(manifest, slug);

  if (!fs.existsSync(path.join(SOUNDSCAPE_ROOT, 'village-fire.m4a'))) {
    console.log('Generating soundscapes…');
    generateSoundscapes(manifest);
  } else {
    manifest.soundscapes = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).soundscapes ?? [];
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\nWrote ${manifestPath}`);
}

main();
