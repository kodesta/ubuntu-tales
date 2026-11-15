#!/usr/bin/env node
/**
 * Bulk content import (production plan 6.2): validates a directory or files of story JSON against the
 * same schema the seed uses, then copies them into `content/stories/`. Editorial use only.
 *
 * Usage: node tools/content-import.mjs ./incoming-tales [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFrom = createRequire(path.join(ROOT, 'packages/shared/package.json'));
const { contentStorySchema } = requireFrom('./dist/index.js');

const args = process.argv.slice(2).filter((arg) => arg !== '--dry-run');
const dryRun = process.argv.includes('--dry-run');
const source = args[0];

if (!source) {
  console.error('Usage: node tools/content-import.mjs <directory-or-json-file> [--dry-run]');
  process.exit(1);
}

const absolute = path.resolve(ROOT, source);
if (!fs.existsSync(absolute)) {
  console.error(`Not found: ${absolute}`);
  process.exit(1);
}

const files = fs.statSync(absolute).isDirectory()
  ? fs.readdirSync(absolute).filter((file) => file.endsWith('.json')).map((file) => path.join(absolute, file))
  : [absolute];

const target = path.join(ROOT, 'content/stories');
let imported = 0;
const errors = [];

for (const file of files) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const parsed = contentStorySchema.safeParse(raw);
  if (!parsed.success) {
    errors.push(`${path.basename(file)}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`).join('; ')}`);
    continue;
  }
  const destination = path.join(target, `${parsed.data.slug}.json`);
  if (fs.existsSync(destination) && !dryRun) {
    errors.push(`${path.basename(file)}: slug "${parsed.data.slug}" already exists in content/stories.`);
    continue;
  }
  if (dryRun) {
    console.log(`would import ${parsed.data.slug}`);
  } else {
    fs.copyFileSync(file, destination);
    console.log(`imported ${parsed.data.slug}`);
  }
  imported += 1;
}

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} file(s) failed validation:`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log(`\n${dryRun ? 'Dry run: ' : ''}${imported} tale(s) valid. Run \`pnpm db:seed\` to load them.`);
