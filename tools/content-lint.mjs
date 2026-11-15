#!/usr/bin/env node
/**
 * Editorial content lint for the `/content` catalogue (production plan 6.2). Fails when a tale looks
 * like a placeholder, is too thin, or references a missing tribe/category/narrator/cover.
 *
 * Usage: node tools/content-lint.mjs   (root script: pnpm content:lint)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const COVERS = path.join(ROOT, 'apps/web/public/covers');
const PLACEHOLDER = /lorem|ipsum|todo|tbd|placeholder|\[\[|\{\{/i;
const MIN_WORDS = 120;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const problems = [];
const warnings = [];

const tribes = readJson(path.join(CONTENT, 'tribes.json'));
const categories = readJson(path.join(CONTENT, 'categories.json'));
const narrators = readJson(path.join(CONTENT, 'narrators.json'));
const tribeSlugs = new Set(tribes.map((tribe) => tribe.slug));
const categorySlugs = new Set(categories.map((category) => category.slug));
const narratorSlugs = new Set(narrators.map((narrator) => narrator.slug));

const storiesDir = path.join(CONTENT, 'stories');
const files = fs.readdirSync(storiesDir).filter((file) => file.endsWith('.json'));
const countsByTribe = new Map();

for (const file of files) {
  const story = readJson(path.join(storiesDir, file));
  const where = `stories/${file}`;
  const words = story.body.paragraphs.reduce(
    (total, paragraph) => total + paragraph.sentences.reduce((sum, sentence) => sum + sentence.text.trim().split(/\s+/).filter(Boolean).length, 0),
    0,
  );

  if (words < MIN_WORDS) problems.push(`${where}: only ${words} words (minimum ${MIN_WORDS}).`);
  if (!tribeSlugs.has(story.tribeSlug)) problems.push(`${where}: unknown tribeSlug "${story.tribeSlug}".`);
  if (!categorySlugs.has(story.categorySlug)) problems.push(`${where}: unknown categorySlug "${story.categorySlug}".`);
  if (story.narratorSlug && !narratorSlugs.has(story.narratorSlug)) problems.push(`${where}: unknown narratorSlug "${story.narratorSlug}".`);

  const text = [story.title, story.summary, story.moral ?? '', ...story.body.paragraphs.flatMap((p) => p.sentences.map((s) => s.text))].join(' ');
  if (PLACEHOLDER.test(text)) problems.push(`${where}: contains placeholder text.`);
  if (text.includes('  ')) warnings.push(`${where}: double spaces in prose.`);
  if (story.summary.length < 60) warnings.push(`${where}: summary shorter than 60 characters.`);

  const coverFile = path.join(ROOT, 'apps/web/public', story.cover.url);
  if (!fs.existsSync(coverFile)) problems.push(`${where}: cover ${story.cover.url} is missing.`);
  countsByTribe.set(story.tribeSlug, (countsByTribe.get(story.tribeSlug) ?? 0) + 1);
}

// Launch threshold: every active publication should have at least 5 tales (plan 6.2).
for (const tribe of tribes) {
  const count = countsByTribe.get(tribe.slug) ?? 0;
  if (count < 5) warnings.push(`tribe ${tribe.slug}: only ${count} tale(s) — launch needs ≥5 or isActive=false.`);
}

// Duplicate slugs
const slugs = new Set();
for (const file of files) {
  const story = readJson(path.join(storiesDir, file));
  if (slugs.has(story.slug)) problems.push(`stories/${file}: duplicate slug "${story.slug}".`);
  slugs.add(story.slug);
}

// Cover/mark inventory
const coverFiles = new Set(fs.readdirSync(COVERS));
for (const story of files.map((file) => readJson(path.join(storiesDir, file)))) {
  const name = path.basename(story.cover.url);
  if (!coverFiles.has(name)) problems.push(`cover asset missing: ${name}`);
}

console.log(`Content lint — ${files.length} tales, ${tribes.length} publications, ${narrators.length} griots`);
for (const warning of warnings) console.log(`  ⚠ ${warning}`);
for (const problem of problems) console.error(`  ✗ ${problem}`);
console.log(problems.length === 0 ? `\n✓ Content passes (${warnings.length} warning(s)).` : `\n✗ ${problems.length} problem(s).`);
process.exit(problems.length === 0 ? 0 : 1);
