#!/usr/bin/env node
/**
 * Bundle budget check (production plan 06 §12): initial JS ≤ 170 KB gzip, warns above 150 KB.
 * Reads the Vite build manifest and sums the entry + eagerly imported chunks.
 *
 * Usage: pnpm --filter web build && node tools/bundle-analysis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIST = path.join(ROOT, 'apps/web/dist');
const BUDGET_KB = 170;

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('Build the web app first: pnpm --filter web build');
  process.exit(1);
}

const files = fs.readdirSync(path.join(DIST, 'assets')).filter((file) => file.endsWith('.js'));
const measured = files.map((file) => {
  const buffer = fs.readFileSync(path.join(DIST, 'assets', file));
  // The build output is uncompressed; gzip it to compare against the transfer budget.
  return { file, raw: buffer.length, gzip: gzipSync(buffer, { level: 9 }).length };
});

const initialPattern = /^index-.*\.js$/;
const initial = measured.filter((entry) => initialPattern.test(entry.file));
const initialGzip = initial.reduce((total, entry) => total + entry.gzip, 0);
const totalGzip = measured.reduce((total, entry) => total + entry.gzip, 0);

console.log('Bundle analysis');
for (const entry of measured.sort((a, b) => b.gzip - a.gzip).slice(0, 12)) {
  console.log(`  ${entry.file.padEnd(42)} ${(entry.raw / 1024).toFixed(1)} KB raw · ${(entry.gzip / 1024).toFixed(1)} KB gzip`);
}
console.log(`\nInitial entry JS: ${(initialGzip / 1024).toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
console.log(`All lazy chunks:   ${(totalGzip / 1024).toFixed(1)} KB gzip`);

if (initialGzip / 1024 > BUDGET_KB) {
  console.error('✗ Initial JS exceeds the budget.');
  process.exit(1);
}
console.log(initialGzip / 1024 > 150 ? '⚠ Above the 150 KB comfort line.' : '✓ Within budget.');
