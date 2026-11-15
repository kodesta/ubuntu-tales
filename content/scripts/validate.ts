#!/usr/bin/env node
/**
 * Validates the editorial catalogue in /content against the Zod schemas in @ubuntu-tales/shared,
 * checks the editorial rules from content/README.md, and verifies that every referenced cover SVG
 * exists, is well-formed XML and matches the expected size.
 *
 * Run from the repository root:
 *   packages/db/node_modules/.bin/tsx content/scripts/validate.ts
 *
 * (`tsx` ships with packages/db; the shared package is already built into packages/shared/dist.)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  contentCategorySchema,
  contentNarratorSchema,
  contentStorySchema,
  contentTribeSchema,
  flattenSentences,
  countWords,
  type ContentCategory,
  type ContentNarrator,
  type ContentStory,
  type ContentTribe,
} from '@ubuntu-tales/shared';

const ROOT = process.cwd();
const CONTENT = join(ROOT, 'content');
const COVERS = join(ROOT, 'apps', 'web', 'public', 'covers');

const errors: string[] = [];
const warnings: string[] = [];

function fail(message: string): void {
  errors.push(message);
}

function warn(message: string): void {
  warnings.push(message);
}

function readJson<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch (error) {
    fail(`${file}: invalid JSON — ${(error as Error).message}`);
    return undefined as unknown as T;
  }
}

function parseZod<T>(
  label: string,
  schema: {
    safeParse: (value: unknown) => { success: boolean; data?: T; error?: { issues: unknown[] } };
  },
  value: unknown,
): T | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  for (const issue of result.error?.issues ?? []) {
    fail(`${label}: ${JSON.stringify(issue)}`);
  }
  return undefined;
}

/* ---------------------------------------------------------------------------------------------
 * SVG sanity check: well-formed nesting, single root, no external/raster/text content.
 * ------------------------------------------------------------------------------------------- */
const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'rect',
  'circle',
  'ellipse',
  'path',
  'polygon',
  'polyline',
  'line',
  'title',
  'desc',
]);

function checkSvg(file: string, expectedWidth: number, expectedHeight: number): boolean {
  const name = file.slice(file.lastIndexOf('/') + 1);
  if (!existsSync(file)) {
    fail(`${name}: missing file`);
    return false;
  }
  const source = readFileSync(file, 'utf8');
  const problems: string[] = [];

  // No text / raster / external references.
  if (/<text[\s>]/.test(source)) problems.push('contains <text> (font-dependent)');
  if (/<image[\s>]/.test(source)) problems.push('contains <image>');
  if (/<foreignObject[\s>]/.test(source)) problems.push('contains <foreignObject>');
  if (/data:image|base64,/i.test(source)) problems.push('contains embedded raster data');
  if (/(?:xlink:)?href\s*=/.test(source)) problems.push('contains a hyperlink/reference');
  if (/@font-face|<font[\s>]/i.test(source)) problems.push('depends on a font');

  // Attribute duplicate detection + tag balance.
  const stack: string[] = [];
  let root = '';
  const tagPattern = /<([/!?]?)([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source)) !== null) {
    const [, prefix, element, rawAttrs, selfClosing] = match;
    if (prefix === '!' || prefix === '?') continue;
    if (prefix === '/') {
      const open = stack.pop();
      if (open !== element)
        problems.push(`unbalanced </${element}> (expected </${open ?? 'nothing'}>)`);
      continue;
    }
    if (!ALLOWED_ELEMENTS.has(element)) problems.push(`disallowed element <${element}>`);
    if (!root) root = element;
    else if (stack.length === 0) problems.push(`multiple root elements (second <${element}>)`);

    const attrNames = [...rawAttrs.matchAll(/([A-Za-z_:][\w:.-]*)\s*=/g)].map((m) => m[1]);
    const seen = new Set<string>();
    for (const attr of attrNames) {
      if (seen.has(attr)) problems.push(`duplicate attribute ${attr} on <${element}>`);
      seen.add(attr);
    }
    if (!selfClosing) stack.push(element);
  }
  if (stack.length) problems.push(`unclosed elements: ${stack.join(', ')}`);
  if (root !== 'svg') problems.push(`root element is <${root || 'none'}>, expected <svg>`);

  // Viewport contract.
  const viewBox = /viewBox="([^"]+)"/.exec(source)?.[1];
  const width = /<svg[^>]*\swidth="([^"]+)"/.exec(source)?.[1];
  const height = /<svg[^>]*\sheight="([^"]+)"/.exec(source)?.[1];
  if (viewBox !== `0 0 ${expectedWidth} ${expectedHeight}`) {
    problems.push(`viewBox is "${viewBox}", expected "0 0 ${expectedWidth} ${expectedHeight}"`);
  }
  if (width !== String(expectedWidth) || height !== String(expectedHeight)) {
    problems.push(
      `width/height is ${width}×${height}, expected ${expectedWidth}×${expectedHeight}`,
    );
  }

  for (const problem of problems) fail(`${name}: ${problem}`);
  return problems.length === 0;
}

/* ---------------------------------------------------------------------------------------------
 * Load + validate content
 * ------------------------------------------------------------------------------------------- */
const categoriesRaw = readJson<unknown>(join(CONTENT, 'categories.json'));
const tribesRaw = readJson<unknown>(join(CONTENT, 'tribes.json'));
const narratorsRaw = readJson<unknown>(join(CONTENT, 'narrators.json'));

const categories: ContentCategory[] = [];
const tribes: ContentTribe[] = [];
const narrators: ContentNarrator[] = [];

if (!Array.isArray(categoriesRaw)) fail('categories.json: expected a JSON array');
else {
  for (const [index, entry] of categoriesRaw.entries()) {
    const parsed = parseZod(`categories[${index}]`, contentCategorySchema, entry);
    if (parsed) categories.push(parsed);
  }
}

if (!Array.isArray(tribesRaw)) fail('tribes.json: expected a JSON array');
else {
  for (const [index, entry] of tribesRaw.entries()) {
    const parsed = parseZod(`tribes[${index}]`, contentTribeSchema, entry);
    if (parsed) tribes.push(parsed);
  }
}

if (!Array.isArray(narratorsRaw)) fail('narrators.json: expected a JSON array');
else {
  for (const [index, entry] of narratorsRaw.entries()) {
    const parsed = parseZod(`narrators[${index}]`, contentNarratorSchema, entry);
    if (parsed) narrators.push(parsed);
  }
}

if (categories.length !== 5) fail(`categories: ${categories.length} found, expected exactly 5`);
if (tribes.length !== 16) fail(`tribes: ${tribes.length} found, expected exactly 16`);
if (narrators.length !== 7) fail(`narrators: ${narrators.length} found, expected exactly 7`);

// Categories: slugs, badges and order from content/README.md.
const expectedCategories = [
  { slug: 'animal', name: 'Animal tales', badge: 'ANIMAL TALE' },
  { slug: 'trickster', name: 'Trickster tales', badge: 'TRICKSTER TALE' },
  { slug: 'wisdom', name: 'Wisdom tales', badge: 'WISDOM TALE' },
  { slug: 'folklore', name: 'Folklore', badge: 'FOLKLORE' },
  { slug: 'creation', name: 'Creation myths', badge: 'CREATION MYTH' },
];
for (const expected of expectedCategories) {
  const category = categories.find((candidate) => candidate.slug === expected.slug);
  if (!category) {
    fail(`categories: missing "${expected.slug}"`);
    continue;
  }
  if (category.name !== expected.name) fail(`categories/${expected.slug}: name "${category.name}"`);
  if (category.badge !== expected.badge)
    fail(`categories/${expected.slug}: badge "${category.badge}"`);
}
for (const [index, category] of [...categories]
  .sort((a, b) => a.sortOrder - b.sortOrder)
  .entries()) {
  if (category.sortOrder !== index + 1)
    fail(`categories/${category.slug}: sortOrder ${category.sortOrder}, expected ${index + 1}`);
}

// Tribe contracts.
const expectedTribes = [
  'zulu',
  'shona',
  'yoruba',
  'ashanti',
  'maasai',
  'dogon',
  'san-khoikhoi',
  'kuba',
  'tonga',
  'igbo',
  'xhosa',
  'mandinka',
  'kikuyu',
  'amhara',
  'oromo',
  'hausa',
];
const tribeSlugs = new Set(tribes.map((tribe) => tribe.slug));
for (const slug of expectedTribes) if (!tribeSlugs.has(slug)) fail(`tribes: missing "${slug}"`);
for (const [index, tribe] of [...tribes].sort((a, b) => a.sortOrder - b.sortOrder).entries()) {
  if (tribe.sortOrder !== index + 1)
    fail(`tribes/${tribe.slug}: sortOrder ${tribe.sortOrder}, expected ${index + 1}`);
  if (!tribe.tagline) fail(`tribes/${tribe.slug}: missing tagline`);
  if (!tribe.description) fail(`tribes/${tribe.slug}: missing description`);
  if (tribe.description && tribe.description.split(/(?<=[.!?])\s+/).filter(Boolean).length < 2) {
    fail(`tribes/${tribe.slug}: description should be 2–3 sentences`);
  }
  if (tribe.subscriberCount < 900 || tribe.subscriberCount > 18000) {
    fail(`tribes/${tribe.slug}: subscriberCount ${tribe.subscriberCount} outside 900–18000`);
  }
  if (tribe.image?.url !== `/covers/publication-${tribe.slug}.svg`) {
    fail(`tribes/${tribe.slug}: image.url "${tribe.image?.url}"`);
  }
  if (tribe.image && tribe.image.accent !== tribe.accentColor) {
    warn(`tribes/${tribe.slug}: image.accent differs from accentColor`);
  }
}
const subscriberCounts = tribes.map((tribe) => tribe.subscriberCount);
if (new Set(subscriberCounts).size !== subscriberCounts.length) {
  fail('tribes: subscriberCount values are not distinct');
}
const taglines = tribes.map((tribe) => tribe.tagline);
if (new Set(taglines).size !== taglines.length) fail('tribes: taglines are not unique');

// Narrator contracts.
for (const narrator of narrators) {
  if (!narrator.roleLabel) fail(`narrators/${narrator.slug}: missing roleLabel`);
  if (!narrator.bio) fail(`narrators/${narrator.slug}: missing bio`);
  if (!narrator.accentColor) fail(`narrators/${narrator.slug}: missing accentColor`);
}
const narratorSlugs = new Set(narrators.map((narrator) => narrator.slug));

/* ---------------------------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------------------------- */
const storyFiles = readdirSync(join(CONTENT, 'stories'))
  .filter((file) => file.endsWith('.json'))
  .sort();
if (storyFiles.length !== 18) fail(`stories: ${storyFiles.length} files found, expected 18`);

const stories: ContentStory[] = [];
for (const file of storyFiles) {
  const raw = readJson<unknown>(join(CONTENT, 'stories', file));
  const story = parseZod(`stories/${file}`, contentStorySchema, raw);
  if (!story) continue;
  if (`${story.slug}.json` !== file)
    fail(`stories/${file}: slug "${story.slug}" does not match filename`);
  stories.push(story);
}

const regionByTribe = new Map(tribes.map((tribe) => [tribe.slug, tribe.region]));
const categorySlugs = new Set(categories.map((category) => category.slug));

const publishedAtValues: string[] = [];
const popularityValues: number[] = [];
const featuredStories: ContentStory[] = [];
let totalParagraphs = 0;
let totalWords = 0;

for (const story of stories) {
  const label = `stories/${story.slug}`;
  if (!tribeSlugs.has(story.tribeSlug)) fail(`${label}: unknown tribeSlug "${story.tribeSlug}"`);
  if (!categorySlugs.has(story.categorySlug))
    fail(`${label}: unknown categorySlug "${story.categorySlug}"`);
  if (!story.narratorSlug || !narratorSlugs.has(story.narratorSlug)) {
    fail(`${label}: unknown narratorSlug "${story.narratorSlug}"`);
  }
  if (!story.attribution) fail(`${label}: missing attribution`);
  if (!story.moral) fail(`${label}: missing moral`);
  if (story.moral && story.moral.length > 300) fail(`${label}: moral longer than 300 chars`);
  if (!story.regionLabel) fail(`${label}: missing regionLabel`);
  if (story.regionLabel && story.tribeSlug) {
    const expectedRegion = regionByTribe.get(story.tribeSlug)?.replaceAll('_', ' ');
    if (story.regionLabel !== expectedRegion) {
      fail(`${label}: regionLabel "${story.regionLabel}", expected "${expectedRegion}"`);
    }
  }
  // Summary contract: one sentence, 90–180 characters.
  if (story.summary.length < 90 || story.summary.length > 180) {
    fail(`${label}: summary is ${story.summary.length} chars, expected 90–180`);
  }
  // Cover contract.
  if (story.cover.url !== `/covers/${story.slug}.svg`)
    fail(`${label}: cover.url "${story.cover.url}"`);
  if (story.cover.width !== 1200 || story.cover.height !== 800)
    fail(`${label}: cover must be 1200×800`);
  if (story.cover.accent !== tribes.find((tribe) => tribe.slug === story.tribeSlug)?.accentColor) {
    warn(`${label}: cover.accent differs from the tribe accentColor`);
  }

  // Dates: 2026-09-01 … 2026-11-14 inclusive, valid ISO.
  const published = new Date(story.publishedAt);
  if (Number.isNaN(published.getTime())) fail(`${label}: publishedAt is not a valid date`);
  else {
    const start = new Date('2026-09-01T00:00:00.000Z').getTime();
    const end = new Date('2026-11-14T23:59:59.999Z').getTime();
    if (published.getTime() < start || published.getTime() > end) {
      fail(`${label}: publishedAt ${story.publishedAt} outside 2026-09-01 … 2026-11-14`);
    }
    publishedAtValues.push(story.publishedAt);
  }

  // Popularity: distinct, 0.40–0.95.
  if (story.popularityScore < 0.4 || story.popularityScore > 0.95) {
    fail(`${label}: popularityScore ${story.popularityScore} outside 0.40–0.95`);
  }
  popularityValues.push(story.popularityScore);

  // Body shape.
  const paragraphs = story.body.paragraphs;
  const featured = story.isFeatured === true;
  if (featured) featuredStories.push(story);
  const expected = featured
    ? { minParas: 10, maxParas: 14, minWords: 600, maxWords: 1000 }
    : { minParas: 4, maxParas: 7, minWords: 250, maxWords: 500 };
  if (paragraphs.length < expected.minParas || paragraphs.length > expected.maxParas) {
    fail(
      `${label}: ${paragraphs.length} paragraphs, expected ${expected.minParas}–${expected.maxParas}`,
    );
  }
  const words = countWords(story.body);
  totalWords += words;
  totalParagraphs += paragraphs.length;
  if (words < expected.minWords || words > expected.maxWords) {
    fail(`${label}: ${words} words, expected ${expected.minWords}–${expected.maxWords}`);
  }

  paragraphs.forEach((paragraph, index) => {
    const expectedId = `p_${String(index + 1).padStart(2, '0')}`;
    if (paragraph.id !== expectedId)
      fail(`${label}: paragraph id "${paragraph.id}", expected "${expectedId}"`);
  });

  const flat = flattenSentences(story.body);
  flat.forEach(({ index, sentence }) => {
    const expectedId = `s_${String(index + 1).padStart(4, '0')}`;
    if (sentence.id !== expectedId)
      fail(`${label}: sentence id "${sentence.id}", expected "${expectedId}"`);
    if (sentence.text !== sentence.text.trim())
      fail(`${label}/${sentence.id}: leading/trailing whitespace`);
    if (!/[.!?…]["”’']?$/.test(sentence.text)) {
      fail(
        `${label}/${sentence.id}: does not end with punctuation: "${sentence.text.slice(0, 48)}…"`,
      );
    }
    if (/\s{2,}/.test(sentence.text)) fail(`${label}/${sentence.id}: double space`);
    if (/\b(lorem|ipsum|TODO|TBD|placeholder)\b/i.test(sentence.text)) {
      fail(`${label}/${sentence.id}: placeholder text found`);
    }
  });

  // No markdown / speaker-label soup inside body text.
  const plain = story.body.paragraphs
    .map((p) => p.sentences.map((s) => s.text).join(' '))
    .join(' ');
  if (/[*_`#]|\]\s*\(/.test(plain)) fail(`${label}: markdown characters found in body`);

  totalParagraphs += 0;
}

// Catalogue-level coverage.
if (stories.length === 18) {
  if (featuredStories.length !== 3) {
    fail(`stories: ${featuredStories.length} featured, expected exactly 3`);
  }
  const usedCategories = new Set(stories.map((story) => story.categorySlug));
  for (const category of expectedCategories) {
    if (!usedCategories.has(category.slug))
      fail(`stories: no tale uses category "${category.slug}"`);
  }
  const usedTribes = new Set(stories.map((story) => story.tribeSlug));
  for (const slug of expectedTribes) {
    if (!usedTribes.has(slug)) fail(`stories: no tale for tribe "${slug}"`);
  }
  const hasLatest = publishedAtValues.some(
    (value) => new Date(value).toISOString() === '2026-11-14T06:00:00.000Z',
  );
  if (!hasLatest) fail('stories: latest tale must be published on 2026-11-14 (06:00Z)');
  if (new Set(publishedAtValues).size !== publishedAtValues.length) {
    warnings.push('stories: publishedAt values are not all distinct');
  }
  if (new Set(popularityValues).size !== popularityValues.length) {
    fail('stories: popularityScore values are not distinct');
  }
  const featuredCategories = new Set(featuredStories.map((story) => story.categorySlug));
  if (featuredCategories.size !== 3) {
    warnings.push('stories: the three flagship tales share a category');
  }
}

/* ---------------------------------------------------------------------------------------------
 * Artwork on disk
 * ------------------------------------------------------------------------------------------- */
const coverFiles = existsSync(COVERS)
  ? readdirSync(COVERS).filter((file) => file.endsWith('.svg'))
  : [];
if (!existsSync(COVERS)) fail(`covers: directory missing (${COVERS})`);
if (coverFiles.length !== 34)
  fail(`covers: ${coverFiles.length} SVG files found, expected 34 (18 + 16)`);

for (const tribe of tribes) {
  if (tribe.image) checkSvg(join(COVERS, `publication-${tribe.slug}.svg`), 600, 600);
}
let storyCoverCount = 0;
for (const story of stories) {
  if (checkSvg(join(COVERS, `${story.slug}.svg`), 1200, 800)) storyCoverCount += 1;
}
const markCount = tribes.length;
const coverNames = new Set(coverFiles);
for (const file of coverFiles) {
  const isStory = stories.some((story) => `${story.slug}.svg` === file);
  const isMark = tribes.some((tribe) => `publication-${tribe.slug}.svg` === file);
  if (!isStory && !isMark) fail(`covers/${file}: orphan artwork not referenced by content`);
}
for (const story of stories) {
  if (!coverNames.has(`${story.slug}.svg`)) fail(`stories/${story.slug}: cover file missing`);
}

/* ---------------------------------------------------------------------------------------------
 * Report
 * ------------------------------------------------------------------------------------------- */
const summary = {
  categories: categories.length,
  tribes: tribes.length,
  narrators: narrators.length,
  stories: stories.length,
  featured: featuredStories.length,
  storyCovers: storyCoverCount,
  publicationMarks: markCount,
  totalParagraphs,
  totalWords,
  averageWords: stories.length ? Math.round(totalWords / stories.length) : 0,
};
console.log('Ubuntu Tales — content validation');
console.log(JSON.stringify(summary, null, 2));

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const warning of warnings) console.log(` - ${warning}`);
}

if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log('\n✓ All content files, references and cover SVGs are valid.');
