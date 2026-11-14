#!/usr/bin/env node
/**
 * Generates the Phase 1 artwork set for Ubuntu Tales:
 *   apps/web/public/covers/<story-slug>.svg           — 18 story covers, 1200×800
 *   apps/web/public/covers/publication-<tribe-slug>.svg — 16 publication marks, 600×600
 *
 * Every cover is a bespoke layered flat-geometry composition (no templates, no gradients,
 * no external images, no text, no embedded rasters) using the design-token palette from
 * docs/design/substack-experience.md. Run:
 *   node content/scripts/generate-artwork.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'apps', 'web', 'public', 'covers');

/* ---------------------------------------------------------------------------------------------
 * Palette — design tokens plus flat tints derived from them
 * ------------------------------------------------------------------------------------------- */
const C = {
  paper: '#FBF7F0',
  raised: '#FFFDF9',
  sunk: '#F4ECDF',
  ink: '#1E1A17',
  inkSoft: '#453D36',
  muted: '#7A6E63',
  faint: '#9A8E82',
  line: '#E5DBCC',
  lineStrong: '#D3C5B2',
  terracotta: '#B4472C',
  terracottaDark: '#8D3520',
  terracottaWash: '#F6E4DC',
  saffron: '#DF9A2B',
  saffronWash: '#FBF0DA',
  saffronDeep: '#B87C20',
  forest: '#2F5D4E',
  forestWash: '#E3ECE7',
  forestDark: '#234A3D',
  clay: '#8C5A3C',
  clayLight: '#C08A62',
  clayWash: '#EFE0D2',
  sand: '#EAD6B4',
  sandLight: '#F5EAD6',
  mist: '#9FB4AA',
};

const r1 = (n) => Math.round(n * 10) / 10;

/* ---------------------------------------------------------------------------------------------
 * Tiny SVG helpers
 * ------------------------------------------------------------------------------------------- */
const tag = (name, attrs, close = true) => {
  const body = Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
  return close ? `<${name} ${body}/>` : `<${name} ${body}>`;
};
const rect = (x, y, w, h, fill, rx = 0) => tag('rect', { x, y, width: w, height: h, rx, fill });
const circle = (cx, cy, r, fill, extra = '') =>
  `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`;
const ellipse = (cx, cy, rx, ry, fill, rotate = 0) =>
  `<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="${fill}"` +
  (rotate ? ` transform="rotate(${rotate} ${r1(cx)} ${r1(cy)})"` : '') +
  '/>';
const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra ? ` ${extra}` : ''}/>`;
const poly = (points, fill) =>
  `<polygon points="${points.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" fill="${fill}"/>`;
const strokePath = (d, stroke, width, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"${extra ? ` ${extra}` : ''}/>`;
const line = (x1, y1, x2, y2, stroke, width, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ` ${extra}` : ''}/>`;
const g = (children, transform = '') =>
  `<g${transform ? ` transform="${transform}"` : ''}>${children.join('')}</g>`;

/* ---------------------------------------------------------------------------------------------
 * Motifs
 * ------------------------------------------------------------------------------------------- */
function star(x, y, s, fill) {
  const t = s * 0.32;
  return poly(
    [
      [x, y - s],
      [x + t, y - t],
      [x + s, y],
      [x + t, y + t],
      [x, y + s],
      [x - t, y + t],
      [x - s, y],
      [x - t, y - t],
    ],
    fill,
  );
}

function starField(points, fill, s = 5) {
  return points.map(([x, y, scale = 1]) => star(x, y, s * scale, fill)).join('');
}

function bird(x, y, s, fill) {
  return path(
    `M ${r1(x - 20 * s)} ${r1(y + 7 * s)} ` +
      `C ${r1(x - 13 * s)} ${r1(y - 9 * s)}, ${r1(x - 4 * s)} ${r1(y - 9 * s)}, ${r1(x)} ${r1(y)} ` +
      `C ${r1(x + 4 * s)} ${r1(y - 9 * s)}, ${r1(x + 13 * s)} ${r1(y - 9 * s)}, ${r1(x + 20 * s)} ${r1(y + 7 * s)} ` +
      `C ${r1(x + 11 * s)} ${r1(y - 1 * s)}, ${r1(x + 4 * s)} ${r1(y + 2 * s)}, ${r1(x)} ${r1(y + 8 * s)} ` +
      `C ${r1(x - 4 * s)} ${r1(y + 2 * s)}, ${r1(x - 11 * s)} ${r1(y - 1 * s)}, ${r1(x - 20 * s)} ${r1(y + 7 * s)} Z`,
    fill,
  );
}

function cloud(x, y, s, fill) {
  return g(
    [
      circle(x - 46 * s, y + 4 * s, 30 * s, fill),
      circle(x - 12 * s, y - 14 * s, 38 * s, fill),
      circle(x + 30 * s, y - 4 * s, 32 * s, fill),
      circle(x + 58 * s, y + 10 * s, 24 * s, fill),
      rect(x - 60 * s, y + 4 * s, 122 * s, 30 * s, fill, 15 * s),
    ],
    '',
  );
}

function baobab(x, ground, s, fill) {
  return g(
    [
      path(
        `M ${r1(x - 48 * s)} ${r1(ground)} ` +
          `C ${r1(x - 42 * s)} ${r1(ground - 120 * s)}, ${r1(x - 30 * s)} ${r1(ground - 210 * s)}, ${r1(x - 22 * s)} ${r1(ground - 268 * s)} ` +
          `L ${r1(x + 26 * s)} ${r1(ground - 262 * s)} ` +
          `C ${r1(x + 32 * s)} ${r1(ground - 200 * s)}, ${r1(x + 44 * s)} ${r1(ground - 120 * s)}, ${r1(x + 54 * s)} ${r1(ground)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 12 * s)} ${r1(ground - 250 * s)} ` +
          `C ${r1(x - 52 * s)} ${r1(ground - 296 * s)}, ${r1(x - 92 * s)} ${r1(ground - 328 * s)}, ${r1(x - 132 * s)} ${r1(ground - 330 * s)} ` +
          `L ${r1(x - 128 * s)} ${r1(ground - 342 * s)} ` +
          `C ${r1(x - 84 * s)} ${r1(ground - 352 * s)}, ${r1(x - 38 * s)} ${r1(ground - 318 * s)}, ${r1(x + 2 * s)} ${r1(ground - 276 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x + 8 * s)} ${r1(ground - 254 * s)} ` +
          `C ${r1(x + 46 * s)} ${r1(ground - 300 * s)}, ${r1(x + 86 * s)} ${r1(ground - 326 * s)}, ${r1(x + 128 * s)} ${r1(ground - 316 * s)} ` +
          `L ${r1(x + 132 * s)} ${r1(ground - 328 * s)} ` +
          `C ${r1(x + 92 * s)} ${r1(ground - 344 * s)}, ${r1(x + 48 * s)} ${r1(ground - 312 * s)}, ${r1(x + 4 * s)} ${r1(ground - 274 * s)} Z`,
        fill,
      ),
      ellipse(x, ground - 250 * s, 34 * s, 14 * s, fill),
    ],
    '',
  );
}

function acacia(x, ground, s, fill) {
  return g(
    [
      path(
        `M ${r1(x - 9 * s)} ${r1(ground)} L ${r1(x - 5 * s)} ${r1(ground - 118 * s)} L ${r1(x + 5 * s)} ${r1(ground - 118 * s)} L ${r1(x + 9 * s)} ${r1(ground)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 6 * s)} ${r1(ground - 96 * s)} C ${r1(x - 52 * s)} ${r1(ground - 126 * s)}, ${r1(x - 82 * s)} ${r1(ground - 148 * s)}, ${r1(x - 96 * s)} ${r1(ground - 168 * s)} L ${r1(x - 88 * s)} ${r1(ground - 176 * s)} C ${r1(x - 64 * s)} ${r1(ground - 152 * s)}, ${r1(x - 30 * s)} ${r1(ground - 136 * s)}, ${r1(x)} ${r1(ground - 132 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x + 6 * s)} ${r1(ground - 96 * s)} C ${r1(x + 50 * s)} ${r1(ground - 128 * s)}, ${r1(x + 84 * s)} ${r1(ground - 146 * s)}, ${r1(x + 100 * s)} ${r1(ground - 164 * s)} L ${r1(x + 92 * s)} ${r1(ground - 174 * s)} C ${r1(x + 62 * s)} ${r1(ground - 150 * s)}, ${r1(x + 28 * s)} ${r1(ground - 134 * s)}, ${r1(x)} ${r1(ground - 128 * s)} Z`,
        fill,
      ),
      ellipse(x, ground - 146 * s, 158 * s, 30 * s, fill),
      ellipse(x - 96 * s, ground - 132 * s, 64 * s, 22 * s, fill),
      ellipse(x + 104 * s, ground - 136 * s, 60 * s, 20 * s, fill),
      ellipse(x - 40 * s, ground - 164 * s, 70 * s, 20 * s, fill),
      ellipse(x + 46 * s, ground - 166 * s, 66 * s, 19 * s, fill),
    ],
    '',
  );
}

function zebu(x, ground, s, fill) {
  return g(
    [
      ellipse(x, ground - 26 * s, 34 * s, 17 * s, fill),
      circle(x - 16 * s, ground - 46 * s, 12 * s, fill),
      path(
        `M ${r1(x - 26 * s)} ${r1(ground - 22 * s)} L ${r1(x - 22 * s)} ${r1(ground)} L ${r1(x - 18 * s)} ${r1(ground)} L ${r1(x - 18 * s)} ${r1(ground - 22 * s)} Z ` +
          `M ${r1(x - 6 * s)} ${r1(ground - 20 * s)} L ${r1(x - 5 * s)} ${r1(ground)} L ${r1(x - 1 * s)} ${r1(ground)} L ${r1(x - 1 * s)} ${r1(ground - 20 * s)} Z ` +
          `M ${r1(x + 12 * s)} ${r1(ground - 20 * s)} L ${r1(x + 13 * s)} ${r1(ground)} L ${r1(x + 17 * s)} ${r1(ground)} L ${r1(x + 17 * s)} ${r1(ground - 20 * s)} Z ` +
          `M ${r1(x + 26 * s)} ${r1(ground - 22 * s)} L ${r1(x + 28 * s)} ${r1(ground)} L ${r1(x + 32 * s)} ${r1(ground)} L ${r1(x + 31 * s)} ${r1(ground - 22 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 26 * s)} ${r1(ground - 32 * s)} L ${r1(x - 40 * s)} ${r1(ground - 48 * s)} L ${r1(x - 46 * s)} ${r1(ground - 62 * s)} L ${r1(x - 40 * s)} ${r1(ground - 64 * s)} L ${r1(x - 34 * s)} ${r1(ground - 50 * s)} L ${r1(x - 24 * s)} ${r1(ground - 40 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 42 * s)} ${r1(ground - 60 * s)} C ${r1(x - 50 * s)} ${r1(ground - 74 * s)}, ${r1(x - 54 * s)} ${r1(ground - 76 * s)}, ${r1(x - 58 * s)} ${r1(ground - 70 * s)}`,
        fill,
        `stroke="${fill}" stroke-width="${3 * s}" stroke-linecap="round"`,
      ),
      path(
        `M ${r1(x - 40 * s)} ${r1(ground - 62 * s)} C ${r1(x - 46 * s)} ${r1(ground - 78 * s)}, ${r1(x - 40 * s)} ${r1(ground - 82 * s)}, ${r1(x - 34 * s)} ${r1(ground - 76 * s)}`,
        fill,
        `stroke="${fill}" stroke-width="${3 * s}" stroke-linecap="round"`,
      ),
      path(
        `M ${r1(x + 30 * s)} ${r1(ground - 34 * s)} C ${r1(x + 40 * s)} ${r1(ground - 40 * s)}, ${r1(x + 42 * s)} ${r1(ground - 58 * s)}, ${r1(x + 38 * s)} ${r1(ground - 62 * s)}`,
        fill,
        `stroke="${fill}" stroke-width="${2.5 * s}" stroke-linecap="round"`,
      ),
    ],
    '',
  );
}

function eland(x, ground, s, fill) {
  const leg = (dx, w) =>
    path(
      `M ${r1(x + dx * s)} ${r1(ground - 108 * s)} L ${r1(x + (dx + w) * s)} ${r1(ground - 106 * s)} L ${r1(x + (dx + w * 0.7) * s)} ${r1(ground)} L ${r1(x + (dx - w * 1.1) * s)} ${r1(ground)} Z`,
      fill,
    );
  return g(
    [
      ellipse(x, ground - 112 * s, 102 * s, 54 * s, fill),
      // shoulder hump
      ellipse(x - 44 * s, ground - 148 * s, 40 * s, 28 * s, fill),
      // chest and neck
      path(
        `M ${r1(x - 64 * s)} ${r1(ground - 156 * s)} L ${r1(x - 104 * s)} ${r1(ground - 212 * s)} L ${r1(x - 86 * s)} ${r1(ground - 224 * s)} L ${r1(x - 28 * s)} ${r1(ground - 170 * s)} Z`,
        fill,
      ),
      // head
      ellipse(x - 108 * s, ground - 218 * s, 30 * s, 20 * s, fill, -22),
      // muzzle
      ellipse(x - 126 * s, ground - 210 * s, 14 * s, 10 * s, fill, -16),
      // ears
      path(
        `M ${r1(x - 112 * s)} ${r1(ground - 228 * s)} L ${r1(x - 130 * s)} ${r1(ground - 240 * s)} L ${r1(x - 122 * s)} ${r1(ground - 220 * s)} Z`,
        fill,
      ),
      // horns (short, swept back, stroked)
      strokePath(
        `M ${r1(x - 102 * s)} ${r1(ground - 232 * s)} C ${r1(x - 108 * s)} ${r1(ground - 258 * s)}, ${r1(x - 94 * s)} ${r1(ground - 266 * s)}, ${r1(x - 86 * s)} ${r1(ground - 246 * s)}`,
        fill,
        5 * s,
        'stroke-linecap="round"',
      ),
      strokePath(
        `M ${r1(x - 114 * s)} ${r1(ground - 230 * s)} C ${r1(x - 130 * s)} ${r1(ground - 254 * s)}, ${r1(x - 118 * s)} ${r1(ground - 264 * s)}, ${r1(x - 108 * s)} ${r1(ground - 246 * s)}`,
        fill,
        5 * s,
        'stroke-linecap="round"',
      ),
      leg(-58, 17),
      leg(-30, 16),
      leg(54, 17),
      leg(78, 16),
      // tail
      strokePath(
        `M ${r1(x + 98 * s)} ${r1(ground - 124 * s)} C ${r1(x + 112 * s)} ${r1(ground - 120 * s)}, ${r1(x + 116 * s)} ${r1(ground - 98 * s)}, ${r1(x + 112 * s)} ${r1(ground - 86 * s)}`,
        fill,
        6 * s,
        'stroke-linecap="round"',
      ),
    ],
    '',
  );
}

function hare(x, ground, s, fill) {
  return g(
    [
      ellipse(x, ground - 26 * s, 24 * s, 19 * s, fill),
      circle(x - 16 * s, ground - 48 * s, 12 * s, fill),
      ellipse(x - 24 * s, ground - 76 * s, 5 * s, 23 * s, fill, -14),
      ellipse(x - 13 * s, ground - 76 * s, 5 * s, 23 * s, fill, 4),
      path(
        `M ${r1(x - 18 * s)} ${r1(ground - 32 * s)} L ${r1(x - 30 * s)} ${r1(ground - 8 * s)} L ${r1(x - 26 * s)} ${r1(ground)} L ${r1(x - 18 * s)} ${r1(ground - 16 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x + 4 * s)} ${r1(ground - 18 * s)} L ${r1(x)} ${r1(ground)} L ${r1(x + 10 * s)} ${r1(ground)} L ${r1(x + 14 * s)} ${r1(ground - 14 * s)} Z`,
        fill,
      ),
      circle(x - 22 * s, ground - 51 * s, 2 * s, C.ink),
      strokePath(
        `M ${r1(x + 20 * s)} ${r1(ground - 30 * s)} C ${r1(x + 30 * s)} ${r1(ground - 34 * s)}, ${r1(x + 32 * s)} ${r1(ground - 26 * s)}, ${r1(x + 26 * s)} ${r1(ground - 20 * s)}`,
        fill,
        4 * s,
        'stroke-linecap="round"',
      ),
    ],
    '',
  );
}

function hyena(x, ground, s, fill, bagFill, hareEye) {
  return g(
    [
      // bag on the back
      path(
        `M ${r1(x - 40 * s)} ${r1(ground - 70 * s)} C ${r1(x - 40 * s)} ${r1(ground - 112 * s)}, ${r1(x + 30 * s)} ${r1(ground - 112 * s)}, ${r1(x + 30 * s)} ${r1(ground - 70 * s)} Z`,
        bagFill,
      ),
      strokePath(
        `M ${r1(x - 32 * s)} ${r1(ground - 96 * s)} L ${r1(x + 22 * s)} ${r1(ground - 96 * s)} M ${r1(x - 28 * s)} ${r1(ground - 84 * s)} L ${r1(x + 18 * s)} ${r1(ground - 84 * s)}`,
        C.clay,
        3 * s,
        'stroke-linecap="round"',
      ),
      ellipse(x, ground - 52 * s, 48 * s, 26 * s, fill),
      path(
        `M ${r1(x - 40 * s)} ${r1(ground - 66 * s)} L ${r1(x - 62 * s)} ${r1(ground - 92 * s)} L ${r1(x - 58 * s)} ${r1(ground - 98 * s)} L ${r1(x - 34 * s)} ${r1(ground - 74 * s)} Z`,
        fill,
      ),
      ellipse(x - 68 * s, ground - 96 * s, 17 * s, 12 * s, fill),
      path(
        `M ${r1(x - 80 * s)} ${r1(ground - 102 * s)} L ${r1(x - 92 * s)} ${r1(ground - 112 * s)} L ${r1(x - 84 * s)} ${r1(ground - 94 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 78 * s)} ${r1(ground - 96 * s)} L ${r1(x - 88 * s)} ${r1(ground - 86 * s)} L ${r1(x - 70 * s)} ${r1(ground - 90 * s)} Z`,
        fill,
      ),
      ellipse(x - 74 * s, ground - 100 * s, 2 * s, 2 * s, hareEye),
      // legs
      path(
        `M ${r1(x - 30 * s)} ${r1(ground - 40 * s)} L ${r1(x - 26 * s)} ${r1(ground)} L ${r1(x - 18 * s)} ${r1(ground)} L ${r1(x - 16 * s)} ${r1(ground - 40 * s)} Z ` +
          `M ${r1(x - 8 * s)} ${r1(ground - 40 * s)} L ${r1(x - 6 * s)} ${r1(ground)} L ${r1(x + 2 * s)} ${r1(ground)} L ${r1(x + 2 * s)} ${r1(ground - 40 * s)} Z ` +
          `M ${r1(x + 22 * s)} ${r1(ground - 40 * s)} L ${r1(x + 24 * s)} ${r1(ground)} L ${r1(x + 32 * s)} ${r1(ground)} L ${r1(x + 34 * s)} ${r1(ground - 40 * s)} Z`,
        fill,
      ),
      strokePath(
        `M ${r1(x + 46 * s)} ${r1(ground - 58 * s)} C ${r1(x + 58 * s)} ${r1(ground - 60 * s)}, ${r1(x + 60 * s)} ${r1(ground - 44 * s)}, ${r1(x + 52 * s)} ${r1(ground - 38 * s)}`,
        fill,
        5 * s,
        'stroke-linecap="round"',
      ),
    ],
    '',
  );
}

function fox(x, ground, s, fill) {
  return g(
    [
      ellipse(x, ground - 34 * s, 40 * s, 20 * s, fill),
      path(
        `M ${r1(x - 34 * s)} ${r1(ground - 44 * s)} L ${r1(x - 56 * s)} ${r1(ground - 70 * s)} L ${r1(x - 50 * s)} ${r1(ground - 74 * s)} L ${r1(x - 26 * s)} ${r1(ground - 54 * s)} Z`,
        fill,
      ),
      ellipse(x - 60 * s, ground - 76 * s, 17 * s, 12 * s, fill),
      path(
        `M ${r1(x - 70 * s)} ${r1(ground - 86 * s)} L ${r1(x - 74 * s)} ${r1(ground - 104 * s)} L ${r1(x - 62 * s)} ${r1(ground - 88 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 58 * s)} ${r1(ground - 86 * s)} L ${r1(x - 56 * s)} ${r1(ground - 102 * s)} L ${r1(x - 50 * s)} ${r1(ground - 88 * s)} Z`,
        fill,
      ),
      ellipse(x - 56 * s, ground - 78 * s, 2 * s, 2 * s, C.ink),
      // legs
      path(
        `M ${r1(x - 22 * s)} ${r1(ground - 22 * s)} L ${r1(x - 20 * s)} ${r1(ground)} L ${r1(x - 13 * s)} ${r1(ground)} L ${r1(x - 12 * s)} ${r1(ground - 22 * s)} Z ` +
          `M ${r1(x + 4 * s)} ${r1(ground - 22 * s)} L ${r1(x + 5 * s)} ${r1(ground)} L ${r1(x + 12 * s)} ${r1(ground)} L ${r1(x + 12 * s)} ${r1(ground - 22 * s)} Z ` +
          `M ${r1(x + 22 * s)} ${r1(ground - 22 * s)} L ${r1(x + 24 * s)} ${r1(ground)} L ${r1(x + 31 * s)} ${r1(ground)} L ${r1(x + 31 * s)} ${r1(ground - 22 * s)} Z`,
        fill,
      ),
      // bushy tail
      path(
        `M ${r1(x + 36 * s)} ${r1(ground - 44 * s)} C ${r1(x + 70 * s)} ${r1(ground - 48 * s)}, ${r1(x + 74 * s)} ${r1(ground - 12 * s)}, ${r1(x + 46 * s)} ${r1(ground - 14 * s)} C ${r1(x + 46 * s)} ${r1(ground - 26 * s)}, ${r1(x + 44 * s)} ${r1(ground - 34 * s)}, ${r1(x + 36 * s)} ${r1(ground - 34 * s)} Z`,
        fill,
      ),
    ],
    '',
  );
}

function tortoise(x, ground, s, shellFill, bodyFill, shellPattern) {
  return g(
    [
      // legs
      path(
        `M ${r1(x - 78 * s)} ${r1(ground - 24 * s)} L ${r1(x - 92 * s)} ${r1(ground)} L ${r1(x - 78 * s)} ${r1(ground)} L ${r1(x - 66 * s)} ${r1(ground - 20 * s)} Z ` +
          `M ${r1(x + 62 * s)} ${r1(ground - 24 * s)} L ${r1(x + 78 * s)} ${r1(ground)} L ${r1(x + 92 * s)} ${r1(ground)} L ${r1(x + 76 * s)} ${r1(ground - 20 * s)} Z`,
        bodyFill,
      ),
      // tail
      path(
        `M ${r1(x + 96 * s)} ${r1(ground - 26 * s)} L ${r1(x + 116 * s)} ${r1(ground - 32 * s)} L ${r1(x + 104 * s)} ${r1(ground - 16 * s)} Z`,
        bodyFill,
      ),
      // head
      path(
        `M ${r1(x - 92 * s)} ${r1(ground - 74 * s)} C ${r1(x - 138 * s)} ${r1(ground - 78 * s)}, ${r1(x - 142 * s)} ${r1(ground - 34 * s)}, ${r1(x - 104 * s)} ${r1(ground - 32 * s)} Z`,
        bodyFill,
      ),
      circle(x - 126 * s, ground - 58 * s, 3 * s, C.ink),
      // shell dome
      path(
        `M ${r1(x - 104 * s)} ${r1(ground - 30 * s)} C ${r1(x - 104 * s)} ${r1(ground - 148 * s)}, ${r1(x + 104 * s)} ${r1(ground - 148 * s)}, ${r1(x + 104 * s)} ${r1(ground - 30 * s)} Z`,
        shellFill,
      ),
      // shell rim
      rect(x - 108 * s, ground - 34 * s, 216 * s, 12 * s, bodyFill, 6 * s),
      shellPattern ? shellPattern(x, ground, s) : '',
    ],
    '',
  );
}

function chameleon(x, y, s, fill, branchFill) {
  return g(
    [
      // curled tail
      strokePath(
        `M ${r1(x + 54 * s)} ${r1(y - 6 * s)} C ${r1(x + 92 * s)} ${r1(y - 10 * s)}, ${r1(x + 96 * s)} ${r1(y + 34 * s)}, ${r1(x + 66 * s)} ${r1(y + 34 * s)} C ${r1(x + 48 * s)} ${r1(y + 34 * s)}, ${r1(x + 46 * s)} ${r1(y + 14 * s)}, ${r1(x + 60 * s)} ${r1(y + 12 * s)}`,
        fill,
        9 * s,
        'stroke-linecap="round"',
      ),
      // body
      path(
        `M ${r1(x - 42 * s)} ${r1(y - 4 * s)} C ${r1(x - 26 * s)} ${r1(y - 30 * s)}, ${r1(x + 30 * s)} ${r1(y - 26 * s)}, ${r1(x + 52 * s)} ${r1(y - 2 * s)} C ${r1(x + 30 * s)} ${r1(y + 18 * s)}, ${r1(x - 26 * s)} ${r1(y + 20 * s)}, ${r1(x - 42 * s)} ${r1(y - 4 * s)} Z`,
        fill,
      ),
      // head
      path(
        `M ${r1(x - 40 * s)} ${r1(y - 6 * s)} C ${r1(x - 66 * s)} ${r1(y - 20 * s)}, ${r1(x - 84 * s)} ${r1(y - 2 * s)}, ${r1(x - 66 * s)} ${r1(y + 12 * s)} C ${r1(x - 54 * s)} ${r1(y + 18 * s)}, ${r1(x - 46 * s)} ${r1(y + 8 * s)}, ${r1(x - 40 * s)} ${r1(y - 6 * s)} Z`,
        fill,
      ),
      // crest
      path(
        `M ${r1(x - 56 * s)} ${r1(y - 16 * s)} L ${r1(x - 48 * s)} ${r1(y - 30 * s)} L ${r1(x - 40 * s)} ${r1(y - 16 * s)} Z`,
        fill,
      ),
      // legs gripping branch
      path(
        `M ${r1(x - 24 * s)} ${r1(y + 8 * s)} L ${r1(x - 30 * s)} ${r1(y + 30 * s)} L ${r1(x - 20 * s)} ${r1(y + 30 * s)} L ${r1(x - 16 * s)} ${r1(y + 10 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x + 24 * s)} ${r1(y + 8 * s)} L ${r1(x + 22 * s)} ${r1(y + 30 * s)} L ${r1(x + 32 * s)} ${r1(y + 30 * s)} L ${r1(x + 32 * s)} ${r1(y + 8 * s)} Z`,
        fill,
      ),
      // branch
      path(
        `M ${r1(x - 260 * s)} ${r1(y + 66 * s)} C ${r1(x - 120 * s)} ${r1(y + 44 * s)}, ${r1(x + 40 * s)} ${r1(y + 40 * s)}, ${r1(x + 200 * s)} ${r1(y + 58 * s)}`,
        'none',
        `stroke="${branchFill}" stroke-width="${12 * s}" stroke-linecap="round"`,
      ),
      // eye
      circle(x - 58 * s, y - 4 * s, 6 * s, C.paper),
      circle(x - 58 * s, y - 4 * s, 2.6 * s, fill),
      // leaf clusters on branch
      ellipse(x + 120 * s, y + 48 * s, 16 * s, 7 * s, branchFill, -20),
      ellipse(x + 150 * s, y + 54 * s, 14 * s, 6 * s, branchFill, 10),
      ellipse(x - 210 * s, y + 60 * s, 15 * s, 7 * s, branchFill, 15),
    ],
    '',
  );
}

function rooster(x, ground, s, fill, comb) {
  return g(
    [
      ellipse(x, ground - 40 * s, 30 * s, 22 * s, fill, -8),
      path(
        `M ${r1(x - 22 * s)} ${r1(ground - 56 * s)} C ${r1(x - 30 * s)} ${r1(ground - 86 * s)}, ${r1(x - 18 * s)} ${r1(ground - 92 * s)}, ${r1(x - 10 * s)} ${r1(ground - 70 * s)} Z`,
        fill,
      ),
      circle(x - 8 * s, ground - 72 * s, 13 * s, fill),
      path(
        `M ${r1(x - 8 * s)} ${r1(ground - 86 * s)} L ${r1(x - 4 * s)} ${r1(ground - 98 * s)} L ${r1(x)} ${r1(ground - 86 * s)} Z`,
        comb,
      ),
      path(
        `M ${r1(x - 20 * s)} ${r1(ground - 76 * s)} L ${r1(x - 38 * s)} ${r1(ground - 88 * s)} L ${r1(x - 30 * s)} ${r1(ground - 68 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x + 22 * s)} ${r1(ground - 44 * s)} C ${r1(x + 54 * s)} ${r1(ground - 66 * s)}, ${r1(x + 60 * s)} ${r1(ground - 34 * s)}, ${r1(x + 34 * s)} ${r1(ground - 26 * s)} C ${r1(x + 30 * s)} ${r1(ground - 36 * s)}, ${r1(x + 26 * s)} ${r1(ground - 40 * s)}, ${r1(x + 22 * s)} ${r1(ground - 36 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 8 * s)} ${r1(ground - 22 * s)} L ${r1(x - 8 * s)} ${r1(ground)} M ${r1(x + 8 * s)} ${r1(ground - 22 * s)} L ${r1(x + 8 * s)} ${r1(ground)}`,
        'none',
        `stroke="${fill}" stroke-width="${3.5 * s}"`,
      ),
    ],
    '',
  );
}

function drum(x, ground, s, bodyFill, headFill, laceFill) {
  return g(
    [
      path(
        `M ${r1(x - 74 * s)} ${r1(ground - 300 * s)} C ${r1(x - 104 * s)} ${r1(ground - 180 * s)}, ${r1(x - 100 * s)} ${r1(ground - 90 * s)}, ${r1(x - 66 * s)} ${r1(ground)} L ${r1(x + 66 * s)} ${r1(ground)} C ${r1(x + 100 * s)} ${r1(ground - 90 * s)}, ${r1(x + 104 * s)} ${r1(ground - 180 * s)}, ${r1(x + 74 * s)} ${r1(ground - 300 * s)} Z`,
        bodyFill,
      ),
      ellipse(x, ground - 300 * s, 74 * s, 22 * s, headFill),
      ellipse(x, ground - 300 * s, 58 * s, 15 * s, bodyFill),
      // lacing
      strokePath(
        `M ${r1(x - 60 * s)} ${r1(ground - 268 * s)} L ${r1(x + 58 * s)} ${r1(ground - 20 * s)} M ${r1(x + 60 * s)} ${r1(ground - 268 * s)} L ${r1(x - 58 * s)} ${r1(ground - 20 * s)} M ${r1(x - 64 * s)} ${r1(ground - 240 * s)} L ${r1(x + 62 * s)} ${r1(ground - 220 * s)} M ${r1(x + 64 * s)} ${r1(ground - 240 * s)} L ${r1(x - 62 * s)} ${r1(ground - 220 * s)}`,
        laceFill,
        4 * s,
        'stroke-linecap="round"',
      ),
      // waist band
      rect(x - 92 * s, ground - 170 * s, 184 * s, 26 * s, laceFill, 4 * s),
      // base shadow
      ellipse(x, ground + 4 * s, 120 * s, 12 * s, C.inkSoft),
    ],
    '',
  );
}

function calabash(x, ground, s, fill, neckFill) {
  return g(
    [
      circle(x, ground - 36 * s, 42 * s, fill),
      path(
        `M ${r1(x - 16 * s)} ${r1(ground - 72 * s)} L ${r1(x - 12 * s)} ${r1(ground - 92 * s)} L ${r1(x + 12 * s)} ${r1(ground - 92 * s)} L ${r1(x + 16 * s)} ${r1(ground - 72 * s)} Z`,
        neckFill,
      ),
      ellipse(x, ground - 92 * s, 15 * s, 6 * s, neckFill),
      strokePath(
        `M ${r1(x - 34 * s)} ${r1(ground - 44 * s)} C ${r1(x - 10 * s)} ${r1(ground - 34 * s)}, ${r1(x + 10 * s)} ${r1(ground - 34 * s)}, ${r1(x + 34 * s)} ${r1(ground - 44 * s)}`,
        neckFill,
        3 * s,
      ),
    ],
    '',
  );
}

function cup(x, ground, s, fill) {
  return g(
    [
      path(
        `M ${r1(x - 40 * s)} ${r1(ground - 48 * s)} L ${r1(x + 40 * s)} ${r1(ground - 48 * s)} C ${r1(x + 36 * s)} ${r1(ground - 12 * s)}, ${r1(x + 20 * s)} ${r1(ground)}, ${r1(x)} ${r1(ground)} C ${r1(x - 20 * s)} ${r1(ground)}, ${r1(x - 36 * s)} ${r1(ground - 12 * s)}, ${r1(x - 40 * s)} ${r1(ground - 48 * s)} Z`,
        fill,
      ),
      ellipse(x, ground - 48 * s, 40 * s, 10 * s, fill),
      ellipse(x, ground - 48 * s, 30 * s, 6 * s, C.paper),
    ],
    '',
  );
}

function saltBlock(x, ground, s, fill, lineFill) {
  return g(
    [
      rect(x - 34 * s, ground - 52 * s, 68 * s, 52 * s, fill, 3 * s),
      path(
        `M ${r1(x - 34 * s)} ${r1(ground - 52 * s)} L ${r1(x - 22 * s)} ${r1(ground - 66 * s)} L ${r1(x + 44 * s)} ${r1(ground - 66 * s)} L ${r1(x + 34 * s)} ${r1(ground - 52 * s)} Z`,
        lineFill,
      ),
      strokePath(
        `M ${r1(x - 18 * s)} ${r1(ground - 40 * s)} L ${r1(x + 20 * s)} ${r1(ground - 40 * s)} M ${r1(x - 18 * s)} ${r1(ground - 28 * s)} L ${r1(x + 20 * s)} ${r1(ground - 28 * s)}`,
        lineFill,
        3 * s,
      ),
    ],
    '',
  );
}

function aloe(x, ground, s, fill) {
  const leaf = (rot, len) =>
    `<path d="M ${r1(x - 7 * s)} ${r1(ground)} C ${r1(x - 5 * s)} ${r1(ground - len * 0.6)} ${r1(x + 5 * s)} ${r1(ground - len * 0.6)} ${r1(x + 7 * s)} ${r1(ground)} Z" fill="${fill}" transform="rotate(${rot} ${r1(x)} ${r1(ground)})"/>`;
  return g(
    [leaf(-58, 70), leaf(-36, 100), leaf(-12, 118), leaf(12, 110), leaf(38, 88), leaf(60, 62)],
    '',
  );
}

function figTree(x, ground, s, trunkFill, canopyFill) {
  return g(
    [
      path(
        `M ${r1(x - 16 * s)} ${r1(ground)} L ${r1(x - 10 * s)} ${r1(ground - 150 * s)} L ${r1(x + 10 * s)} ${r1(ground - 150 * s)} L ${r1(x + 18 * s)} ${r1(ground)} Z`,
        trunkFill,
      ),
      path(
        `M ${r1(x - 10 * s)} ${r1(ground - 110 * s)} C ${r1(x - 70 * s)} ${r1(ground - 150 * s)}, ${r1(x - 96 * s)} ${r1(ground - 190 * s)}, ${r1(x - 108 * s)} ${r1(ground - 216 * s)} L ${r1(x - 96 * s)} ${r1(ground - 224 * s)} C ${r1(x - 72 * s)} ${r1(ground - 196 * s)}, ${r1(x - 40 * s)} ${r1(ground - 162 * s)}, ${r1(x - 2 * s)} ${r1(ground - 146 * s)} Z`,
        trunkFill,
      ),
      circle(x - 70 * s, ground - 232 * s, 66 * s, canopyFill),
      circle(x + 4 * s, ground - 260 * s, 84 * s, canopyFill),
      circle(x + 84 * s, ground - 226 * s, 62 * s, canopyFill),
      circle(x - 10 * s, ground - 210 * s, 58 * s, canopyFill),
      ellipse(x + 10 * s, ground - 250 * s, 150 * s, 54 * s, canopyFill),
    ],
    '',
  );
}

function granary(x, ground, s, bodyFill, roofFill, doorFill) {
  return g(
    [
      rect(x - 66 * s, ground - 132 * s, 132 * s, 132 * s, bodyFill, 10 * s),
      path(
        `M ${r1(x - 92 * s)} ${r1(ground - 132 * s)} L ${r1(x)} ${r1(ground - 212 * s)} L ${r1(x + 92 * s)} ${r1(ground - 132 * s)} Z`,
        roofFill,
      ),
      rect(x - 18 * s, ground - 74 * s, 36 * s, 74 * s, doorFill, 3 * s),
      strokePath(
        `M ${r1(x - 52 * s)} ${r1(ground - 108 * s)} L ${r1(x + 52 * s)} ${r1(ground - 108 * s)} M ${r1(x - 52 * s)} ${r1(ground - 92 * s)} L ${r1(x + 52 * s)} ${r1(ground - 92 * s)}`,
        doorFill,
        3 * s,
      ),
    ],
    '',
  );
}

function canoe(x, y, s, hullFill, figureFill) {
  return g(
    [
      path(
        `M ${r1(x - 110 * s)} ${r1(y)} C ${r1(x - 60 * s)} ${r1(y + 34 * s)}, ${r1(x + 60 * s)} ${r1(y + 34 * s)}, ${r1(x + 110 * s)} ${r1(y)} C ${r1(x + 60 * s)} ${r1(y + 14 * s)}, ${r1(x - 60 * s)} ${r1(y + 14 * s)}, ${r1(x - 110 * s)} ${r1(y)} Z`,
        hullFill,
      ),
      circle(x - 18 * s, y - 34 * s, 10 * s, figureFill),
      path(
        `M ${r1(x - 28 * s)} ${r1(y - 2 * s)} L ${r1(x - 24 * s)} ${r1(y - 26 * s)} L ${r1(x - 12 * s)} ${r1(y - 26 * s)} L ${r1(x - 8 * s)} ${r1(y - 2 * s)} Z`,
        figureFill,
      ),
      strokePath(
        `M ${r1(x + 6 * s)} ${r1(y - 26 * s)} L ${r1(x + 68 * s)} ${r1(y + 4 * s)}`,
        figureFill,
        4 * s,
        'stroke-linecap="round"',
      ),
    ],
    '',
  );
}

function sprouts(x, ground, s, stemFill, leafFill, count = 5) {
  const out = [];
  const spread = 46 * s;
  for (let i = 0; i < count; i += 1) {
    const dx = (i - (count - 1) / 2) * spread;
    const h = (36 + ((i * 37) % 44)) * s;
    out.push(
      strokePath(
        `M ${r1(x + dx)} ${r1(ground)} C ${r1(x + dx - 4 * s)} ${r1(ground - h * 0.5)}, ${r1(x + dx + 6 * s)} ${r1(ground - h * 0.7)}, ${r1(x + dx)} ${r1(ground - h)}`,
        stemFill,
        3 * s,
        'stroke-linecap="round"',
      ),
    );
    out.push(ellipse(x + dx - 6 * s, ground - h * 0.78, 10 * s, 4 * s, leafFill, -30));
    out.push(ellipse(x + dx + 8 * s, ground - h * 0.58, 9 * s, 4 * s, leafFill, 30));
  }
  return g(out, '');
}

function camel(x, ground, s, fill, loadFill) {
  return g(
    [
      ellipse(x, ground - 74 * s, 42 * s, 26 * s, fill),
      circle(x - 4 * s, ground - 104 * s, 20 * s, fill),
      rect(x - 26 * s, ground - 118 * s, 30 * s, 18 * s, loadFill, 2 * s),
      rect(x + 4 * s, ground - 116 * s, 26 * s, 16 * s, loadFill, 2 * s),
      path(
        `M ${r1(x - 32 * s)} ${r1(ground - 92 * s)} L ${r1(x - 56 * s)} ${r1(ground - 122 * s)} L ${r1(x - 48 * s)} ${r1(ground - 124 * s)} L ${r1(x - 26 * s)} ${r1(ground - 100 * s)} Z`,
        fill,
      ),
      ellipse(x - 58 * s, ground - 126 * s, 15 * s, 9 * s, fill),
      path(
        `M ${r1(x - 66 * s)} ${r1(ground - 130 * s)} L ${r1(x - 72 * s)} ${r1(ground - 138 * s)} L ${r1(x - 64 * s)} ${r1(ground - 132 * s)} Z`,
        fill,
      ),
      path(
        `M ${r1(x - 24 * s)} ${r1(ground - 56 * s)} L ${r1(x - 22 * s)} ${r1(ground)} M ${r1(x - 6 * s)} ${r1(ground - 56 * s)} L ${r1(x - 2 * s)} ${r1(ground)} M ${r1(x + 22 * s)} ${r1(ground - 56 * s)} L ${r1(x + 24 * s)} ${r1(ground)} M ${r1(x + 34 * s)} ${r1(ground - 56 * s)} L ${r1(x + 38 * s)} ${r1(ground)}`,
        'none',
        `stroke="${fill}" stroke-width="${5 * s}" stroke-linecap="round"`,
      ),
      strokePath(
        `M ${r1(x + 40 * s)} ${r1(ground - 82 * s)} C ${r1(x + 48 * s)} ${r1(ground - 84 * s)}, ${r1(x + 48 * s)} ${r1(ground - 70 * s)}, ${r1(x + 42 * s)} ${r1(ground - 66 * s)}`,
        fill,
        4 * s,
        'stroke-linecap="round"',
      ),
    ],
    '',
  );
}

function lion(x, ground, s, fill) {
  const maneCx = x - 58 * s;
  const maneCy = ground - 96 * s;
  const tufts = [];
  for (let i = 0; i < 11; i += 1) {
    const a = (i / 11) * Math.PI * 2;
    const rIn = 34 * s;
    const rOut = 50 * s;
    const half = Math.PI / 11;
    tufts.push(
      poly(
        [
          [maneCx + Math.cos(a - half) * rIn, maneCy + Math.sin(a - half) * rIn],
          [maneCx + Math.cos(a) * rOut, maneCy + Math.sin(a) * rOut],
          [maneCx + Math.cos(a + half) * rIn, maneCy + Math.sin(a + half) * rIn],
        ],
        fill,
      ),
    );
  }
  return g(
    [
      ellipse(x, ground - 56 * s, 62 * s, 30 * s, fill),
      // mane with a scalloped edge
      circle(maneCx, maneCy, 38 * s, fill),
      ...tufts,
      // head
      circle(x - 66 * s, ground - 92 * s, 24 * s, fill),
      // ear tufts
      poly(
        [
          [x - 78 * s, ground - 114 * s],
          [x - 84 * s, ground - 128 * s],
          [x - 68 * s, ground - 114 * s],
        ],
        fill,
      ),
      poly(
        [
          [x - 58 * s, ground - 115 * s],
          [x - 54 * s, ground - 130 * s],
          [x - 46 * s, ground - 114 * s],
        ],
        fill,
      ),
      circle(x - 72 * s, ground - 96 * s, 3.2 * s, C.paper),
      // legs
      path(
        `M ${r1(x - 40 * s)} ${r1(ground - 40 * s)} L ${r1(x - 38 * s)} ${r1(ground)} L ${r1(x - 25 * s)} ${r1(ground)} L ${r1(x - 25 * s)} ${r1(ground - 40 * s)} Z ` +
          `M ${r1(x - 10 * s)} ${r1(ground - 40 * s)} L ${r1(x - 8 * s)} ${r1(ground)} L ${r1(x + 5 * s)} ${r1(ground)} L ${r1(x + 5 * s)} ${r1(ground - 40 * s)} Z ` +
          `M ${r1(x + 24 * s)} ${r1(ground - 40 * s)} L ${r1(x + 26 * s)} ${r1(ground)} L ${r1(x + 39 * s)} ${r1(ground)} L ${r1(x + 39 * s)} ${r1(ground - 40 * s)} Z ` +
          `M ${r1(x + 46 * s)} ${r1(ground - 40 * s)} L ${r1(x + 48 * s)} ${r1(ground)} L ${r1(x + 61 * s)} ${r1(ground)} L ${r1(x + 61 * s)} ${r1(ground - 40 * s)} Z`,
        fill,
      ),
      // tail with a tuft
      strokePath(
        `M ${r1(x + 60 * s)} ${r1(ground - 66 * s)} C ${r1(x + 84 * s)} ${r1(ground - 72 * s)}, ${r1(x + 86 * s)} ${r1(ground - 40 * s)}, ${r1(x + 72 * s)} ${r1(ground - 34 * s)}`,
        fill,
        6 * s,
        'stroke-linecap="round"',
      ),
      ellipse(x + 70 * s, ground - 30 * s, 8 * s, 11 * s, fill, -20),
    ],
    '',
  );
}

function mantis(x, ground, s, fill) {
  return g(
    [
      ellipse(x, ground - 26 * s, 7 * s, 18 * s, fill, -8),
      circle(x - 2 * s, ground - 48 * s, 9 * s, fill),
      path(
        `M ${r1(x - 2 * s)} ${r1(ground - 58 * s)} L ${r1(x - 14 * s)} ${r1(ground - 68 * s)} L ${r1(x - 12 * s)} ${r1(ground - 72 * s)} L ${r1(x + 2 * s)} ${r1(ground - 62 * s)} Z ` +
          `M ${r1(x + 2 * s)} ${r1(ground - 58 * s)} L ${r1(x + 14 * s)} ${r1(ground - 68 * s)} L ${r1(x + 12 * s)} ${r1(ground - 72 * s)} L ${r1(x - 2 * s)} ${r1(ground - 62 * s)} Z`,
        fill,
      ),
      strokePath(
        `M ${r1(x - 12 * s)} ${r1(ground - 34 * s)} L ${r1(x - 26 * s)} ${r1(ground - 52 * s)} M ${r1(x + 12 * s)} ${r1(ground - 34 * s)} L ${r1(x + 24 * s)} ${r1(ground - 50 * s)}`,
        fill,
        3 * s,
        'stroke-linecap="round"',
      ),
      strokePath(
        `M ${r1(x - 20 * s)} ${r1(ground - 66 * s)} L ${r1(x - 34 * s)} ${r1(ground - 80 * s)} M ${r1(x + 20 * s)} ${r1(ground - 66 * s)} L ${r1(x + 34 * s)} ${r1(ground - 78 * s)}`,
        fill,
        2.5 * s,
        'stroke-linecap="round"',
      ),
      path(
        `M ${r1(x - 8 * s)} ${r1(ground - 8 * s)} L ${r1(x - 20 * s)} ${r1(ground)} M ${r1(x + 8 * s)} ${r1(ground - 8 * s)} L ${r1(x + 20 * s)} ${r1(ground)}`,
        'none',
        `stroke="${fill}" stroke-width="${3 * s}"`,
      ),
    ],
    '',
  );
}

function grass(x, ground, s, fill) {
  return g(
    [
      strokePath(
        `M ${r1(x)} ${r1(ground)} C ${r1(x - 6 * s)} ${r1(ground - 18 * s)}, ${r1(x - 12 * s)} ${r1(ground - 30 * s)}, ${r1(x - 16 * s)} ${r1(ground - 44 * s)} ` +
          `M ${r1(x - 3 * s)} ${r1(ground)} C ${r1(x - 2 * s)} ${r1(ground - 20 * s)}, ${r1(x + 2 * s)} ${r1(ground - 36 * s)}, ${r1(x + 4 * s)} ${r1(ground - 54 * s)} ` +
          `M ${r1(x + 4 * s)} ${r1(ground)} C ${r1(x + 10 * s)} ${r1(ground - 18 * s)}, ${r1(x + 18 * s)} ${r1(ground - 28 * s)}, ${r1(x + 26 * s)} ${r1(ground - 38 * s)}`,
        fill,
        2.2 * s,
        'stroke-linecap="round"',
      ),
    ],
    '',
  );
}

/* Patterns ------------------------------------------------------------------------------------ */
function triangleBand(x, y, width, height, count, fill) {
  const w = width / count;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(
      poly(
        [
          [x + i * w, y],
          [x + (i + 1) * w, y],
          [x + i * w + w / 2, y + height],
        ],
        fill,
      ),
    );
  }
  return g(out, '');
}

function diamondBand(x, y, width, height, count, fill) {
  const w = width / count;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(
      poly(
        [
          [x + i * w + w / 2, y],
          [x + i * w + w * 0.92, y + height / 2],
          [x + i * w + w / 2, y + height],
          [x + i * w + w * 0.08, y + height / 2],
        ],
        fill,
      ),
    );
  }
  return g(out, '');
}

function stripeBand(x, y, width, height, count, fill, thickness = 8) {
  const step = width / count;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(rect(x + i * step, y, thickness, height, fill));
  }
  return g(out, '');
}

function chevronBand(x, y, width, height, count, fill, strokeWidth = 10) {
  const step = width / count;
  const out = [];
  for (let i = 0; i <= count; i += 1) {
    const px = x + i * step;
    out.push(
      strokePath(
        `M ${r1(px - step / 2)} ${r1(y + height)} L ${r1(px)} ${r1(y)} L ${r1(px + step / 2)} ${r1(y + height)}`,
        fill,
        strokeWidth,
      ),
    );
  }
  return g(out, '');
}

function zebraBand(x, y, width, height, count, fill) {
  const w = width / count;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(rect(x + i * w, y, w / 2, height, fill));
  }
  return g(out, '');
}

/* ---------------------------------------------------------------------------------------------
 * Framing
 * ------------------------------------------------------------------------------------------- */
const svgDoc = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
  `${body}</svg>\n`;

const scene = (elements) => elements.filter(Boolean).join('\n');

/* ---------------------------------------------------------------------------------------------
 * Story covers
 * ------------------------------------------------------------------------------------------- */

const covers = {
  /* 1 — creation, Zulu: chameleon before a wide sun */
  'when-the-chameleon-carried-the-word': () => {
    const accent = C.terracotta;
    return scene([
      rect(0, 0, 1200, 800, C.paper),
      circle(690, 330, 320, C.terracottaWash),
      circle(690, 330, 244, C.saffron),
      circle(690, 330, 244, 'none', `stroke="${C.saffronDeep}" stroke-width="10"`),
      // layered hills
      path(
        'M0 610 C 180 552, 360 596, 520 584 C 700 570, 860 612, 1040 586 C 1120 574, 1170 578, 1200 588 L1200 800 L0 800 Z',
        C.clayWash,
      ),
      path(
        'M0 660 C 200 610, 380 646, 560 638 C 760 628, 930 664, 1080 640 C 1130 632, 1170 634, 1200 640 L1200 800 L0 800 Z',
        C.clayLight,
      ),
      path(
        'M0 716 C 220 674, 430 706, 620 698 C 830 688, 1010 720, 1200 700 L1200 800 L0 800 Z',
        accent,
      ),
      // distant birds
      bird(280, 190, 0.9, C.terracottaDark),
      bird(330, 214, 0.7, C.terracottaDark),
      bird(240, 226, 0.6, C.terracottaDark),
      // stars/sparkles in the sky
      starField(
        [
          [120, 300, 0.9],
          [180, 380, 0.6],
          [260, 120, 0.7],
          [90, 180, 0.5],
          [980, 150, 0.8],
          [1070, 240, 0.6],
          [1120, 360, 0.5],
          [930, 90, 0.5],
        ],
        C.terracotta,
      ),
      // branch
      path(
        'M -30 706 C 90 690, 210 636, 350 596 C 420 576, 470 566, 540 566',
        'none',
        `stroke="${C.forestDark}" stroke-width="24" stroke-linecap="round"`,
      ),
      path(
        'M 350 596 C 390 580, 420 560, 438 532',
        'none',
        `stroke="${C.forestDark}" stroke-width="13" stroke-linecap="round"`,
      ),
      ellipse(548, 556, 30, 13, C.forest, -22),
      ellipse(516, 572, 24, 10, C.forest, 12),
      ellipse(420, 540, 24, 10, C.forest, -30),
      ellipse(300, 630, 26, 11, C.forest, 20),
      chameleon(300, 610, 1.25, C.forest, C.forestDark),
      // foreground grass
      grass(120, 800, 4, C.terracottaDark),
      grass(1040, 800, 4.5, C.terracottaDark),
      grass(980, 800, 3.5, C.terracottaDark),
    ]);
  },

  /* 2 — animal, Zulu: hare, lion, well at night */
  'unogwaja-and-the-lions-well': () => {
    const ink = C.ink;
    return scene([
      rect(0, 0, 1200, 800, C.inkSoft),
      rect(0, 0, 1200, 420, C.terracottaWash),
      circle(276, 232, 150, C.paper),
      circle(276, 232, 150, 'none', `stroke="${C.clayLight}" stroke-width="10"`),
      circle(240, 200, 26, C.sunk),
      circle(316, 268, 18, C.sunk),
      circle(300, 190, 11, C.sunk),
      // hills under the moon
      path(
        'M0 430 C 160 388, 330 420, 470 408 C 640 392, 800 428, 960 412 C 1060 402, 1140 410, 1200 418 L1200 560 L0 560 Z',
        C.clay,
      ),
      path(
        'M0 486 C 200 448, 420 480, 610 470 C 800 460, 1030 492, 1200 476 L1200 580 L0 580 Z',
        C.clayLight,
      ),
      // night ground
      rect(0, 552, 1200, 248, ink),
      // stars
      starField(
        [
          [90, 120, 0.7],
          [470, 90, 0.6],
          [560, 180, 0.5],
          [700, 110, 0.8],
          [860, 160, 0.6],
          [1030, 96, 0.7],
          [1130, 210, 0.5],
          [420, 260, 0.4],
        ],
        C.saffron,
      ),
      // well
      circle(700, 600, 168, C.clay),
      circle(700, 600, 140, ink),
      ellipse(700, 512, 168, 26, C.terracotta),
      ellipse(700, 512, 140, 18, ink),
      circle(700, 598, 70, C.ink),
      ellipse(700, 596, 34, 8, C.saffron),
      strokePath(
        'M 660 580 C 680 566, 720 566, 742 584',
        C.lineStrong,
        6,
        'stroke-linecap="round"',
      ),
      // lion leaning over the well from the left
      lion(360, 640, 1.7, C.clayLight),
      // hare on the right
      rect(936, 640, 58, 10, C.saffron, 5),
      hare(950, 640, 1.9, C.paper),
      // small grass
      grass(560, 800, 4, C.clay),
      grass(1100, 800, 4, C.clay),
    ]);
  },

  /* 3 — wisdom, Shona: grain left standing */
  'the-grain-left-standing': () => {
    return scene([
      rect(0, 0, 1200, 800, C.paper),
      rect(0, 0, 1200, 560, C.saffronWash),
      circle(232, 214, 160, C.saffron),
      circle(232, 214, 160, 'none', `stroke="${C.saffronDeep}" stroke-width="8"`),
      // hills
      path(
        'M0 470 C 150 430, 330 452, 500 440 C 700 426, 880 456, 1060 438 C 1130 430, 1170 434, 1200 440 L1200 620 L0 620 Z',
        C.forestWash,
      ),
      path(
        'M0 520 C 200 484, 420 506, 620 496 C 830 486, 1030 512, 1200 496 L1200 800 L0 800 Z',
        C.sand,
      ),
      // field rows
      rect(0, 596, 1200, 204, C.clayWash),
      ...Array.from({ length: 16 }, (_, i) => {
        const x = 30 + i * 76;
        const tall = i > 10;
        const h = tall ? 168 : 116;
        return g([
          strokePath(
            `M ${x} 800 C ${x - 4} ${800 - h * 0.5}, ${x + 6} ${800 - h * 0.7}, ${x} ${800 - h}`,
            C.saffronDeep,
            5,
            'stroke-linecap="round"',
          ),
          ellipse(x - 4, 800 - h * 0.82, 11, 22, C.saffron, -16),
          ellipse(x + 4, 800 - h * 0.64, 10, 20, C.saffron, 14),
          ellipse(x, 800 - h * 0.95, 7, 16, C.saffron, 0),
        ]);
      }),
      // granary
      granary(960, 640, 1.6, C.clay, C.terracottaDark, C.inkSoft),
      // path to granary
      path(
        'M 700 800 C 760 740, 850 690, 930 650 C 960 636, 985 622, 1000 606',
        'none',
        `stroke="${C.sandLight}" stroke-width="26" stroke-linecap="round"`,
      ),
      // birds
      bird(640, 176, 0.8, C.terracotta),
      bird(700, 204, 0.6, C.terracotta),
      bird(560, 236, 0.55, C.terracotta),
      starField(
        [
          [840, 120, 0.6],
          [900, 250, 0.4],
          [1080, 300, 0.5],
          [80, 380, 0.4],
        ],
        C.terracottaWash,
      ),
      grass(1120, 800, 3.5, C.forest),
    ]);
  },

  /* 4 — trickster, Yoruba: tortoise and the birds' feast */
  'ijapa-and-the-feast-above-the-clouds': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(990, 176, 96, C.saffron),
      circle(990, 176, 96, 'none', `stroke="${C.saffronDeep}" stroke-width="7"`),
      // flat clouds
      cloud(220, 190, 1.7, C.paper),
      cloud(700, 120, 1.3, C.paper),
      cloud(420, 300, 0.9, C.raised),
      cloud(1010, 330, 1.1, C.paper),
      // birds rising in a V
      ...[
        [180, 660, 1.15],
        [260, 606, 1.05],
        [340, 552, 0.95],
        [420, 500, 0.85],
        [500, 448, 0.8],
        [590, 398, 0.75],
        [680, 350, 0.7],
        [770, 302, 0.65],
        [860, 256, 0.6],
        [950, 216, 0.55],
      ].map(([x, y, s]) => bird(x, y, s, C.ink)),
      // falling feathers
      ...[
        [540, 560, -18],
        [660, 620, 22],
        [780, 520, -30],
        [860, 640, 14],
        [420, 660, 8],
        [960, 520, -12],
      ].map(([x, y, rot]) =>
        g(
          [
            ellipse(x, y, 7, 20, C.terracotta, rot),
            strokePath(
              `M ${x} ${y - 18} L ${x} ${y + 18}`,
              C.terracottaDark,
              2,
              'stroke-linecap="round"',
            ),
          ],
          '',
        ),
      ),
      // feasting scene far below
      path(
        'M0 690 C 220 650, 420 682, 620 672 C 830 662, 1020 690, 1200 672 L1200 800 L0 800 Z',
        C.clay,
      ),
      path(
        'M0 744 C 250 714, 500 740, 720 730 C 920 722, 1080 744, 1200 732 L1200 800 L0 800 Z',
        C.clayLight,
      ),
      // tortoise with cracked shell
      tortoise(560, 786, 1.5, C.terracotta, C.inkSoft, (x, ground, s) =>
        scene([
          strokePath(
            `M ${r1(x - 60 * s)} ${r1(ground - 40 * s)} L ${r1(x - 30 * s)} ${r1(ground - 72 * s)} L ${r1(x)} ${r1(ground - 44 * s)} L ${r1(x + 34 * s)} ${r1(ground - 78 * s)} L ${r1(x + 64 * s)} ${r1(ground - 42 * s)}`,
            C.saffron,
            5 * s,
            'stroke-linecap="round" stroke-linejoin="round"',
          ),
          ellipse(x - 20 * s, ground - 96 * s, 18 * s, 9 * s, C.saffron, -24),
          ellipse(x + 34 * s, ground - 104 * s, 14 * s, 8 * s, C.saffron, 18),
        ]),
      ),
      starField(
        [
          [80, 470, 0.5],
          [1120, 470, 0.4],
          [300, 400, 0.35],
          [940, 430, 0.4],
        ],
        C.terracotta,
      ),
    ]);
  },

  /* 5 — creation, Yoruba: Obatala's chain */
  'obatala-and-the-chain-of-the-sky': () => {
    const chain = [];
    for (let i = 0; i < 18; i += 1) {
      const y = 26 + i * 36;
      chain.push(
        ellipse(600, y, 20, 13, 'none', 0).replace(
          'fill="none"',
          `fill="none" stroke="${C.saffronDeep}" stroke-width="8"`,
        ),
      );
    }
    return scene([
      rect(0, 0, 1200, 800, C.paper),
      // sky band with a soft lower edge
      path('M0 0 H1200 V286 C 900 342, 300 342, 0 286 Z', C.saffronWash),
      circle(600, 320, 252, C.raised),
      circle(600, 320, 252, 'none').replace(
        'fill="none"',
        `fill="none" stroke="${C.terracottaWash}" stroke-width="3"`,
      ),
      // stars in the sky
      starField(
        [
          [150, 120, 0.7],
          [280, 210, 0.5],
          [420, 90, 0.6],
          [760, 110, 0.7],
          [900, 200, 0.5],
          [1060, 120, 0.6],
          [980, 300, 0.4],
          [220, 330, 0.4],
        ],
        C.terracotta,
      ),
      // chain
      g(chain, ''),
      // descending figures
      ...[
        [600, 150],
        [600, 264],
        [600, 378],
      ].map(([x, y]) =>
        g([
          circle(x, y - 16, 9, C.ink),
          path(
            `M ${x - 8} ${y} L ${x - 6} ${y + 24} L ${x + 6} ${y + 24} L ${x + 8} ${y} Z`,
            C.ink,
          ),
          strokePath(
            `M ${x - 8} ${y + 4} L ${x - 18} ${y + 22} M ${x + 8} ${y + 4} L ${x + 18} ${y + 20}`,
            C.ink,
            4,
            'stroke-linecap="round"',
          ),
        ]),
      ),
      // earth mound
      path('M 240 800 C 300 730, 440 680, 600 680 C 760 680, 900 730, 960 800 Z', C.clay),
      path('M 300 800 C 360 748, 470 706, 600 706 C 730 706, 840 748, 900 800 Z', C.sand),
      // calabash and rooster on the mound
      calabash(430, 732, 1.4, C.terracotta, C.terracottaDark),
      rooster(760, 742, 1.9, C.ink, C.terracotta),
      // tufts
      grass(300, 800, 4, C.clay),
      grass(920, 800, 4, C.clay),
      // side hills
      path('M0 640 C 90 600, 210 620, 300 660 L 300 800 L 0 800 Z', C.forestWash),
      path('M1200 640 C 1110 600, 990 620, 900 660 L 900 800 L 1200 800 Z', C.forestWash),
    ]);
  },

  /* 6 — trickster, Ashanti: Anansi's web and pot */
  'anansi-and-the-pot-of-wisdom': () => {
    const web = [];
    const cx = 400;
    const cy = 330;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      web.push(line(cx, cy, cx + Math.cos(a) * 560, cy + Math.sin(a) * 460, C.muted, 3));
    }
    for (let ring = 1; ring <= 4; ring += 1) {
      const rx = 80 * ring;
      const ry = 64 * ring;
      web.push(
        ellipse(cx, cy, rx, ry, 'none').replace(
          'fill="none"',
          `fill="none" stroke="${C.muted}" stroke-width="3"`,
        ),
      );
    }
    return scene([
      rect(0, 0, 1200, 800, C.forestWash),
      circle(1000, 130, 120, C.saffron),
      circle(1000, 130, 120, 'none', `stroke="${C.saffronDeep}" stroke-width="8"`),
      g(web, ''),
      // forest band
      path(
        'M0 620 C 140 560, 280 600, 420 588 C 600 572, 760 606, 920 592 C 1040 582, 1130 594, 1200 600 L1200 800 L0 800 Z',
        C.forest,
      ),
      // trees
      ...[160, 320, 900, 1060].map((x) =>
        g([
          rect(x - 14, 470, 28, 180, C.forestDark),
          circle(x, 450, 66, C.forestDark),
          circle(x - 52, 486, 44, C.forestDark),
          circle(x + 52, 486, 44, C.forestDark),
        ]),
      ),
      // spider hanging
      strokePath('M 400 330 L 400 470', C.ink, 3),
      circle(400, 480, 16, C.ink),
      circle(400, 508, 20, C.ink),
      strokePath(
        'M 388 496 L 368 480 M 412 496 L 432 478 M 390 520 L 372 542 M 410 520 L 428 542',
        C.ink,
        4,
        'stroke-linecap="round"',
      ),
      // pot
      path(
        'M 700 660 C 660 640, 650 540, 700 502 C 740 490, 840 490, 880 502 C 930 540, 920 640, 880 660 Z',
        C.clay,
      ),
      ellipse(790, 502, 92, 22, C.terracottaDark),
      ellipse(790, 502, 72, 15, C.inkSoft),
      stripeBand(700, 540, 180, 70, 6, C.terracotta, 9),
      // ground
      path(
        'M0 706 C 200 676, 460 700, 700 692 C 900 686, 1080 702, 1200 692 L1200 800 L0 800 Z',
        C.clay,
      ),
      grass(1010, 800, 4, C.forestDark),
      grass(150, 800, 4, C.forestDark),
    ]);
  },

  /* 7 — folklore, Maasai: the acacia at sunset */
  'the-acacia-and-the-herdsmans-promise': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(600, 356, 310, C.saffron),
      circle(600, 356, 310, 'none', `stroke="${C.saffronDeep}" stroke-width="10"`),
      // savanna bands
      path(
        'M0 556 C 180 524, 360 546, 540 538 C 740 530, 920 552, 1100 536 C 1150 532, 1180 534, 1200 538 L1200 700 L0 700 Z',
        C.sand,
      ),
      path(
        'M0 606 C 200 574, 420 598, 620 588 C 820 578, 1020 604, 1200 588 L1200 800 L0 800 Z',
        C.saffronDeep,
      ),
      path(
        'M0 700 C 240 668, 480 690, 720 682 C 920 676, 1080 692, 1200 684 L1200 800 L0 800 Z',
        C.clay,
      ),
      // acacia
      acacia(620, 640, 2.0, C.ink),
      // zebu herd
      zebu(250, 672, 1.1, C.ink),
      zebu(330, 682, 1.0, C.ink),
      zebu(880, 676, 1.05, C.ink),
      zebu(950, 686, 0.95, C.ink),
      // birds
      bird(300, 210, 0.8, C.terracottaDark),
      bird(350, 238, 0.6, C.terracottaDark),
      bird(870, 180, 0.7, C.terracottaDark),
      starField(
        [
          [120, 120, 0.5],
          [1080, 130, 0.5],
          [960, 320, 0.4],
          [180, 380, 0.4],
        ],
        C.terracottaWash,
      ),
      grass(100, 800, 5, C.ink),
      grass(1080, 800, 5, C.ink),
      // dust arcs
      strokePath('M 180 640 C 300 620, 420 624, 540 636', C.sandLight, 5, 'stroke-linecap="round"'),
      strokePath(
        'M 700 660 C 800 644, 900 646, 1000 656',
        C.sandLight,
        5,
        'stroke-linecap="round"',
      ),
    ]);
  },

  /* 8 — folklore, Dogon: the fox reads the sand */
  'the-fox-who-read-the-sand': () => {
    const grid = [];
    for (let i = 0; i < 9; i += 1) {
      for (let j = 0; j < 5; j += 1) {
        grid.push([110 + i * 122, 110 + j * 74, (i + j) % 3 === 0 ? 0.8 : 0.45]);
      }
    }
    return scene([
      rect(0, 0, 1200, 800, C.ink),
      rect(0, 0, 1200, 420, C.terracottaDark),
      // sandy ground layers
      path(
        'M0 470 C 220 430, 420 462, 620 450 C 840 436, 1040 466, 1200 452 L1200 800 L0 800 Z',
        C.clay,
      ),
      path(
        'M0 540 C 260 500, 520 528, 760 516 C 940 506, 1090 526, 1200 514 L1200 800 L0 800 Z',
        C.sand,
      ),
      path(
        'M0 646 C 240 606, 500 636, 740 624 C 940 614, 1080 636, 1200 620 L1200 800 L0 800 Z',
        C.clayLight,
      ),
      // star grid
      starField(grid, C.saffron, 4),
      star(320, 150, 22, C.saffron),
      star(760, 96, 16, C.saffron),
      star(1040, 250, 20, C.saffron),
      // cliffs
      path('M 0 470 L 130 300 L 240 356 L 330 262 L 380 470 Z', C.inkSoft),
      path('M 1200 470 L 1080 290 L 980 340 L 900 250 L 850 470 Z', C.inkSoft),
      path('M 0 470 L 100 380 L 150 470 Z', C.clay),
      path('M 1200 470 L 1100 376 L 1050 470 Z', C.clay),
      // sand reading lines
      strokePath(
        'M 240 596 C 340 566, 460 590, 560 574 C 660 558, 780 582, 880 566',
        C.clay,
        4,
        'stroke-linecap="round"',
      ),
      strokePath(
        'M 320 640 C 420 616, 520 636, 640 622 C 740 610, 820 626, 920 612',
        C.clay,
        4,
        'stroke-linecap="round"',
      ),
      // rock
      path('M 470 690 C 500 650, 640 646, 676 690 Z', C.inkSoft),
      // fox
      fox(600, 690, 2.0, C.paper),
      // paw prints
      ...[
        [760, 700, -12],
        [820, 716, 16],
        [880, 706, -8],
        [940, 724, 12],
      ].map(([x, y, rot]) =>
        g([
          ellipse(x, y, 6, 9, C.inkSoft, rot),
          circle(x - 6, y - 8, 3, C.inkSoft),
          circle(x, y - 10, 3, C.inkSoft),
          circle(x + 6, y - 8, 3, C.inkSoft),
        ]),
      ),
      // grass silhouettes on the ground edge
      grass(1080, 800, 5, C.inkSoft),
    ]);
  },

  /* 9 — animal flagship, San: the Mantis and the Eland */
  'the-mantis-and-the-eland': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(900, 290, 262, C.saffron),
      circle(900, 290, 262, 'none', `stroke="${C.saffronDeep}" stroke-width="10"`),
      // dunes
      path(
        'M0 560 C 200 512, 380 546, 560 534 C 760 520, 960 550, 1200 528 L1200 800 L0 800 Z',
        C.sand,
      ),
      path(
        'M0 636 C 220 592, 440 622, 660 610 C 860 600, 1040 622, 1200 606 L1200 800 L0 800 Z',
        C.clayLight,
      ),
      path(
        'M0 720 C 240 684, 500 710, 740 700 C 940 692, 1080 708, 1200 696 L1200 800 L0 800 Z',
        C.clay,
      ),
      // eland
      eland(450, 700, 2.1, C.ink),
      // mantis on a rock
      path('M 900 690 C 920 654, 1010 650, 1030 690 Z', C.inkSoft),
      mantis(960, 690, 1.7, C.forest),
      // grass
      grass(120, 800, 5, C.clay),
      grass(1100, 800, 5, C.ink),
      grass(680, 800, 4, C.clay),
      // scattered stars / flying seeds
      starField(
        [
          [180, 180, 0.7],
          [280, 120, 0.5],
          [420, 220, 0.6],
          [600, 150, 0.5],
          [740, 110, 0.4],
          [1080, 420, 0.5],
          [760, 380, 0.4],
          [200, 420, 0.4],
        ],
        C.terracotta,
      ),
      // birds
      bird(200, 320, 0.7, C.terracottaDark),
      bird(250, 352, 0.55, C.terracottaDark),
    ]);
  },

  /* 10 — folklore, Kuba: the first drum */
  'the-first-drum': () => {
    return scene([
      rect(0, 0, 1200, 800, C.forestWash),
      rect(0, 0, 1200, 260, C.sandLight),
      circle(600, 260, 150, C.saffron),
      // trees
      ...[110, 250, 950, 1090].map((x) =>
        g([
          rect(x - 16, 330, 32, 260, C.forestDark),
          circle(x, 300, 84, C.forest),
          circle(x - 60, 344, 52, C.forest),
          circle(x + 60, 344, 52, C.forest),
        ]),
      ),
      // cloth pattern side bands
      rect(0, 420, 120, 380, C.terracotta),
      rect(1080, 420, 120, 380, C.terracotta),
      chevronBand(0, 440, 120, 340, 2, C.sand, 12),
      chevronBand(1080, 440, 120, 340, 2, C.sand, 12),
      diamondBand(24, 620, 72, 44, 2, C.ink),
      diamondBand(1104, 620, 72, 44, 2, C.ink),
      // drum
      g([drum(600, 700, 1.55, C.clay, C.terracottaDark, C.sand)], ''),
      // one sound ring, kept quiet
      ellipse(600, 396, 258, 68, 'none').replace(
        'fill="none"',
        `fill="none" stroke="${C.terracottaWash}" stroke-width="6"`,
      ),
      // ground
      path(
        'M0 716 C 240 688, 500 708, 720 700 C 920 694, 1080 708, 1200 698 L1200 800 L0 800 Z',
        C.clay,
      ),
      starField(
        [
          [600, 90, 0.5],
          [480, 150, 0.4],
          [720, 160, 0.4],
        ],
        C.saffronDeep,
      ),
    ]);
  },

  /* 11 — folklore, Tonga: the river that remembers */
  'the-river-that-remembers': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(280, 330, 150, C.saffron),
      circle(280, 330, 150, 'none', `stroke="${C.saffronDeep}" stroke-width="8"`),
      path(
        'M0 440 C 200 404, 420 428, 620 418 C 820 408, 1020 430, 1200 416 L1200 800 L0 800 Z',
        C.forestWash,
      ),
      // far bank baobab
      baobab(980, 470, 1.5, C.forestDark),
      // water bands
      path(
        'M0 470 C 220 450, 440 470, 660 462 C 860 456, 1040 474, 1200 462 L1200 800 L0 800 Z',
        C.forest,
      ),
      path(
        'M0 560 C 240 540, 480 560, 720 552 C 940 546, 1080 562, 1200 552 L1200 800 L0 800 Z',
        C.forestDark,
      ),
      path(
        'M0 660 C 260 640, 520 662, 780 654 C 980 648, 1120 662, 1200 652 L1200 800 L0 800 Z',
        C.inkSoft,
      ),
      // ripples
      ...[
        [200, 500, 90],
        [420, 528, 120],
        [760, 512, 100],
        [980, 540, 80],
        [300, 610, 110],
        [700, 626, 140],
        [1000, 600, 90],
        [540, 706, 130],
      ].map(([x, y, w]) =>
        strokePath(
          `M ${x - w / 2} ${y} Q ${x} ${y - 12} ${x + w / 2} ${y}`,
          C.mist,
          4,
          'stroke-linecap="round"',
        ),
      ),
      // canoe with ferryman
      canoe(560, 560, 1.3, C.ink, C.saffron),
      // reflection of the sun, broken by the current
      path('M 222 478 L 342 478 L 306 748 L 262 748 Z', C.saffron, 'fill-opacity="0.55"'),
      path('M 246 478 L 316 478 L 300 664 L 274 664 Z', C.saffronWash, 'fill-opacity="0.5"'),
      ...[508, 556, 606, 654, 702].map((y, i) =>
        strokePath(
          `M ${244 - i * 3} ${y} Q ${300 - i * 4} ${y - 10} ${356 - i * 9} ${y}`,
          C.forestDark,
          5,
          'stroke-linecap="round"',
        ),
      ),
      // birds
      bird(820, 200, 0.8, C.terracottaDark),
      bird(870, 228, 0.6, C.terracottaDark),
      // sand bank
      path('M0 760 C 60 730, 140 742, 200 800 L 0 800 Z', C.sand),
      grass(1000, 710, 4, C.forestDark),
    ]);
  },

  /* 12 — animal, Igbo: why the tortoise carries his house */
  'why-the-tortoise-carries-his-house': () => {
    return scene([
      rect(0, 0, 1200, 800, C.forestWash),
      circle(600, 260, 170, C.saffron),
      // forest trees
      ...[140, 300, 480, 760, 940, 1080].map((x, i) =>
        g([
          rect(x - 18, 320, 36, 300, C.forestDark),
          circle(x, 290, 90 + (i % 2) * 20, C.forest),
          circle(x - 66, 340, 54, C.forest),
          circle(x + 66, 340, 54, C.forest),
        ]),
      ),
      // ground path
      path(
        'M0 640 C 220 604, 440 628, 660 618 C 860 608, 1040 630, 1200 616 L1200 800 L0 800 Z',
        C.clay,
      ),
      path(
        'M 300 800 C 400 748, 560 706, 730 690 C 850 680, 950 668, 1010 642',
        'none',
        `stroke="${C.sand}" stroke-width="38" stroke-linecap="round"`,
      ),
      // tortoise with patterned house shell
      tortoise(620, 720, 1.85, C.terracotta, C.forestDark, (x, ground, s) =>
        scene([
          diamondBand(x - 84 * s, ground - 116 * s, 168 * s, 44 * s, 5, C.saffron),
          diamondBand(x - 68 * s, ground - 78 * s, 136 * s, 38 * s, 4, C.sand),
          stripeBand(x - 88 * s, ground - 136 * s, 176 * s, 16 * s, 8, C.ink),
        ]),
      ),
      // small house behind tortoise
      g([
        rect(900, 636, 170, 120, C.clay),
        path('M 880 636 L 985 566 L 1090 636 Z', C.terracottaDark),
        rect(968, 690, 34, 66, C.inkSoft),
      ]),
      starField(
        [
          [80, 140, 0.5],
          [1110, 160, 0.5],
          [200, 260, 0.4],
          [1020, 300, 0.4],
        ],
        C.terracottaWash,
      ),
      grass(150, 800, 5, C.forestDark),
      grass(1080, 800, 5, C.forestDark),
      bird(360, 150, 0.7, C.ink),
      bird(410, 180, 0.5, C.ink),
    ]);
  },

  /* 13 — trickster, Xhosa: Hlakanyana and the lion's feast */
  'hlakanyana-and-the-lions-feast': () => {
    return scene([
      rect(0, 0, 1200, 800, C.terracottaWash),
      circle(830, 230, 144, C.paper),
      circle(830, 230, 144, 'none', `stroke="${C.clayLight}" stroke-width="8"`),
      circle(792, 200, 20, C.sunk),
      circle(866, 262, 14, C.sunk),
      // hills
      path(
        'M0 500 C 200 452, 420 486, 620 474 C 820 462, 1020 490, 1200 472 L1200 680 L0 680 Z',
        C.clayLight,
      ),
      path(
        'M0 570 C 240 528, 500 560, 740 550 C 940 542, 1090 562, 1200 550 L1200 800 L0 800 Z',
        C.clay,
      ),
      // lion on the hillside
      lion(930, 610, 1.4, C.terracottaDark),
      // foreground ground
      path(
        'M0 680 C 240 652, 500 674, 740 666 C 940 660, 1090 674, 1200 664 L1200 800 L0 800 Z',
        C.forestDark,
      ),
      // small trickster with feather
      path('M 500 720 C 510 690, 560 686, 574 720 Z', C.inkSoft),
      g([
        circle(540, 620, 20, C.ink),
        path('M 540 638 L 532 690 L 552 690 Z', C.ink),
        strokePath('M 534 650 L 506 674 M 546 650 L 574 670', C.ink, 8, 'stroke-linecap="round"'),
        strokePath('M 540 604 L 552 566 L 562 578 Z', C.saffron, 6),
        strokePath('M 540 698 L 528 720 M 544 698 L 556 720', C.ink, 7, 'stroke-linecap="round"'),
      ]),
      // aloes
      aloe(230, 800, 1.5, C.forest),
      aloe(1080, 800, 1.3, C.forest),
      aloe(960, 800, 1.0, C.terracottaDark),
      starField(
        [
          [120, 200, 0.6],
          [240, 300, 0.5],
          [360, 140, 0.6],
          [620, 200, 0.4],
          [1080, 300, 0.5],
          [1040, 120, 0.5],
        ],
        C.terracotta,
      ),
      bird(300, 420, 0.6, C.inkSoft),
    ]);
  },

  /* 14 — trickster, Mandinka: the hare and the hyena's bag */
  'the-hare-and-the-hyenas-bag': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(230, 300, 140, C.saffron),
      circle(230, 300, 140, 'none', `stroke="${C.saffronDeep}" stroke-width="8"`),
      // ground
      path(
        'M0 560 C 220 522, 440 548, 660 538 C 860 528, 1040 550, 1200 536 L1200 800 L0 800 Z',
        C.sand,
      ),
      path(
        'M0 640 C 240 604, 500 628, 740 618 C 940 610, 1090 626, 1200 616 L1200 800 L0 800 Z',
        C.clayLight,
      ),
      path(
        'M0 724 C 260 690, 520 712, 780 704 C 960 698, 1100 712, 1200 704 L1200 800 L0 800 Z',
        C.clay,
      ),
      // baobab
      baobab(180, 680, 1.9, C.ink),
      // shadows
      ellipse(700, 758, 180, 20, C.clay),
      ellipse(940, 748, 120, 16, C.clay),
      // hyena carrying bag, hare peeking out
      hyena(820, 740, 1.7, C.inkSoft, C.terracotta, C.saffron),
      // hare on top of the bag
      hare(760, 648, 0.8, C.saffron),
      // birds
      bird(520, 200, 0.8, C.terracotta),
      bird(570, 228, 0.6, C.terracotta),
      bird(880, 170, 0.7, C.terracotta),
      starField(
        [
          [420, 120, 0.5],
          [700, 110, 0.5],
          [1080, 160, 0.5],
          [960, 300, 0.4],
        ],
        C.terracottaWash,
      ),
      grass(1120, 800, 5, C.clay),
    ]);
  },

  /* 15 — creation, Kikuyu: Ngai and the sacred fig */
  'ngai-and-the-sacred-fig': () => {
    const rays = [];
    for (let i = 0; i < 14; i += 1) {
      const a = Math.PI + (i / 13) * Math.PI;
      const x1 = 600 + Math.cos(a) * 250;
      const y1 = 470 + Math.sin(a) * 250;
      const x2 = 600 + Math.cos(a) * 620;
      const y2 = 470 + Math.sin(a) * 620;
      rays.push(
        poly(
          [
            [x1, y1],
            [x1 + Math.cos(a + Math.PI / 2) * 24, y1 + Math.sin(a + Math.PI / 2) * 24],
            [x2, y2],
            [x1 - Math.cos(a + Math.PI / 2) * 24, y1 - Math.sin(a + Math.PI / 2) * 24],
          ],
          C.saffron,
        ),
      );
    }
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(600, 470, 190, C.saffron),
      g(rays, ''),
      // mountain
      path('M 280 560 L 600 170 L 920 560 Z', C.clay),
      path('M 500 282 L 600 170 L 700 282 L 660 318 L 620 292 L 580 322 L 540 296 Z', C.paper),
      path('M 280 560 L 390 470 L 450 520 L 520 470 L 600 560 Z', C.clayLight),
      // hills
      path(
        'M0 560 C 220 520, 450 548, 680 538 C 880 528, 1050 548, 1200 534 L1200 800 L0 800 Z',
        C.forestWash,
      ),
      path(
        'M0 640 C 260 600, 520 626, 780 616 C 980 608, 1110 624, 1200 616 L1200 800 L0 800 Z',
        C.forest,
      ),
      // sacred figs
      figTree(300, 720, 1.5, C.forestDark, C.forest),
      figTree(1090, 720, 1.0, C.forestDark, C.forest),
      // ground
      path(
        'M0 720 C 260 692, 540 712, 800 704 C 980 698, 1110 710, 1200 702 L1200 800 L0 800 Z',
        C.clay,
      ),
      // birds
      bird(260, 240, 0.8, C.terracotta),
      bird(310, 268, 0.6, C.terracotta),
      bird(940, 260, 0.7, C.terracotta),
      starField(
        [
          [120, 160, 0.5],
          [1080, 180, 0.5],
          [980, 380, 0.4],
          [200, 400, 0.4],
        ],
        C.saffronDeep,
      ),
      grass(140, 800, 5, C.forestDark),
      grass(1080, 800, 5, C.forestDark),
    ]);
  },

  /* 16 — wisdom, Amhara: the judge and the grain of salt */
  'the-judge-and-the-grain-of-salt': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(920, 260, 200, C.saffron),
      circle(920, 260, 200, 'none', `stroke="${C.saffronDeep}" stroke-width="9"`),
      // highland terraces
      path(
        'M0 470 C 220 430, 460 458, 700 444 C 900 432, 1060 452, 1200 438 L1200 560 L0 560 Z',
        C.forestWash,
      ),
      path(
        'M0 540 C 240 500, 500 528, 760 516 C 960 506, 1100 522, 1200 512 L1200 640 L0 640 Z',
        C.clayWash,
      ),
      path(
        'M0 620 C 220 588, 460 610, 700 602 C 900 596, 1060 610, 1200 600 L1200 800 L0 800 Z',
        C.clay,
      ),
      // terrace lines
      ...[590, 640, 690].map((y) =>
        strokePath(
          `M 0 ${y} C 240 ${y - 16}, 520 ${y + 8}, 800 ${y - 8} C 1000 ${y - 18}, 1120 ${y - 6}, 1200 ${y - 12}`,
          C.clayLight,
          4,
          'stroke-linecap="round"',
        ),
      ),
      // cloth band
      rect(0, 0, 1200, 34, C.terracotta),
      diamondBand(0, 0, 1200, 34, 24, C.sand),
      // mat
      rect(120, 686, 500, 60, C.terracotta, 4),
      chevronBand(120, 686, 500, 60, 10, C.sand, 5),
      // salt blocks
      saltBlock(300, 688, 1.6, C.paper, C.clayLight),
      saltBlock(460, 688, 1.6, C.paper, C.clayLight),
      saltBlock(380, 622, 1.6, C.paper, C.clayLight),
      // cup of water
      cup(640, 700, 1.5, C.terracotta),
      // judge figure
      g([
        circle(900, 590, 26, C.ink),
        path('M 900 614 L 878 706 L 922 706 Z', C.ink),
        strokePath('M 890 640 L 850 690 M 910 640 L 950 686', C.ink, 14, 'stroke-linecap="round"'),
        strokePath('M 958 560 L 958 706', C.clay, 8, 'stroke-linecap="round"'),
        circle(958, 548, 12, C.saffron),
      ]),
      // distant birds
      bird(240, 200, 0.7, C.terracottaDark),
      bird(290, 226, 0.5, C.terracottaDark),
      starField(
        [
          [100, 300, 0.4],
          [1080, 420, 0.4],
        ],
        C.terracottaWash,
      ),
      grass(80, 800, 5, C.forestDark),
      grass(1140, 800, 5, C.forestDark),
    ]);
  },

  /* 17 — creation, Oromo: Waaqa and the first rain */
  'waaqa-and-the-first-rain': () => {
    const rain = [];
    for (let i = 0; i < 26; i += 1) {
      const x = 60 + i * 45;
      const y = 180 + (i % 5) * 14;
      rain.push(
        strokePath(`M ${x} ${y} L ${x - 14} ${y + 120}`, C.mist, 6, 'stroke-linecap="round"'),
      );
    }
    return scene([
      rect(0, 0, 1200, 800, C.forestWash),
      circle(920, 120, 100, C.saffron),
      // flat clouds
      cloud(230, 150, 2.2, C.paper),
      cloud(700, 96, 1.8, C.paper),
      cloud(1030, 190, 1.5, C.paper),
      cloud(420, 60, 1.2, C.raised),
      g(rain, ''),
      // distant peaks
      path('M0 520 L 180 330 L 340 480 L 470 360 L 640 520 Z', C.clayWash),
      path('M 700 520 L 880 320 L 1040 470 L 1120 400 L 1200 520 Z', C.clayWash),
      path(
        'M0 560 C 240 520, 480 548, 720 538 C 920 530, 1080 548, 1200 536 L1200 800 L0 800 Z',
        C.forestWash,
      ),
      path(
        'M0 640 C 260 602, 540 626, 800 616 C 980 610, 1110 622, 1200 614 L1200 800 L0 800 Z',
        C.sand,
      ),
      path(
        'M0 720 C 260 692, 540 710, 800 704 C 980 700, 1110 710, 1200 702 L1200 800 L0 800 Z',
        C.clay,
      ),
      // sprout
      g([
        strokePath('M 600 760 C 600 700, 590 660, 600 620', C.forest, 12, 'stroke-linecap="round"'),
        ellipse(572, 668, 40, 16, C.forest, -32),
        ellipse(628, 648, 36, 14, C.forest, 30),
        ellipse(600, 616, 22, 10, C.forest, 0),
      ]),
      // puddles
      ellipse(360, 740, 90, 14, C.mist),
      ellipse(900, 756, 120, 16, C.mist),
      // birds sheltering
      bird(300, 420, 0.6, C.inkSoft),
      bird(340, 446, 0.5, C.inkSoft),
      starField(
        [
          [120, 470, 0.4],
          [1080, 450, 0.4],
        ],
        C.saffronWash,
      ),
      grass(140, 800, 5, C.forest),
      grass(1060, 800, 5, C.forest),
      grass(760, 800, 4, C.forest),
    ]);
  },

  /* 18 — wisdom, Hausa: the salt caravan */
  'the-salt-caravan': () => {
    return scene([
      rect(0, 0, 1200, 800, C.saffronWash),
      circle(600, 380, 280, C.saffron),
      circle(600, 380, 280, 'none', `stroke="${C.saffronDeep}" stroke-width="10"`),
      // chevron band top
      rect(0, 0, 1200, 46, C.terracotta),
      chevronBand(0, 0, 1200, 46, 16, C.sand, 7),
      // dunes
      path(
        'M0 470 C 200 420, 420 452, 640 438 C 840 426, 1030 452, 1200 434 L1200 620 L0 620 Z',
        C.sand,
      ),
      path(
        'M0 560 C 240 512, 480 544, 720 530 C 920 520, 1080 540, 1200 526 L1200 720 L0 720 Z',
        C.clayLight,
      ),
      path(
        'M0 660 C 260 622, 540 646, 800 636 C 980 630, 1110 644, 1200 636 L1200 800 L0 800 Z',
        C.clay,
      ),
      // ridge lines
      ...[490, 548, 600].map((y) =>
        strokePath(
          `M 0 ${y} C 260 ${y - 20}, 540 ${y + 10}, 820 ${y - 8} C 1010 ${y - 20}, 1120 ${y - 6}, 1200 ${y - 14}`,
          C.sandLight,
          4,
          'stroke-linecap="round"',
        ),
      ),
      // caravan: camels connected by a rope
      strokePath('M 240 640 C 420 620, 700 628, 940 640', C.inkSoft, 3, 'stroke-linecap="round"'),
      camel(270, 660, 1.35, C.inkSoft, C.terracotta),
      camel(500, 668, 1.25, C.inkSoft, C.terracotta),
      camel(730, 662, 1.3, C.inkSoft, C.terracotta),
      camel(950, 670, 1.2, C.inkSoft, C.terracotta),
      // caravan leader with staff
      g([
        circle(1110, 590, 18, C.ink),
        path('M 1110 610 L 1100 686 L 1120 686 Z', C.ink),
        strokePath(
          'M 1100 686 L 1094 720 M 1120 686 L 1126 720',
          C.ink,
          7,
          'stroke-linecap="round"',
        ),
        strokePath('M 1086 580 L 1070 700', C.clay, 6, 'stroke-linecap="round"'),
      ]),
      // birds
      bird(220, 200, 0.8, C.terracottaDark),
      bird(270, 230, 0.6, C.terracottaDark),
      bird(890, 180, 0.7, C.terracottaDark),
      starField(
        [
          [120, 320, 0.4],
          [1080, 300, 0.4],
        ],
        C.terracottaWash,
      ),
      grass(120, 800, 5, C.inkSoft),
      grass(1120, 800, 5, C.inkSoft),
    ]);
  },
};

/* ---------------------------------------------------------------------------------------------
 * Publication marks
 * ------------------------------------------------------------------------------------------- */
const letterPaths = {
  Z: 'M 22 16 H 78 L 22 84 H 78',
  S: 'M 78 18 C 58 2, 24 6, 22 30 C 20 48, 50 50, 58 54 C 78 62, 76 92, 52 96 C 36 98, 22 90, 18 82',
  Y: 'M 20 14 L 50 52 L 80 14 M 50 52 V 90',
  A: 'M 12 90 L 50 12 L 88 90 M 26 62 H 74',
  M: 'M 16 90 V 16 L 50 62 L 84 16 V 90',
  D: 'M 30 14 V 88 H 52 C 88 88 88 14 52 14 Z',
  K: 'M 22 14 V 90 M 82 14 L 22 54 L 82 90',
  T: 'M 14 16 H 86 M 50 16 V 90',
  I: 'M 36 14 H 64 M 50 14 V 90 M 36 90 H 64',
  X: 'M 20 14 L 80 90 M 80 14 L 20 90',
  O: 'M 50 12 C 20 12, 14 32, 14 52 C 14 72, 20 92, 50 92 C 80 92, 86 72, 86 52 C 86 32, 80 12, 50 12 Z',
  H: 'M 20 14 V 90 M 80 14 V 90 M 20 52 H 80',
};

const tribes = [
  { slug: 'zulu', letter: 'Z', accent: '#B4472C', pattern: 'radial' },
  { slug: 'shona', letter: 'S', accent: '#C4692F', pattern: 'rings' },
  { slug: 'yoruba', letter: 'Y', accent: '#D08A2E', pattern: 'chevrons' },
  { slug: 'ashanti', letter: 'A', accent: '#A8502F', pattern: 'web' },
  { slug: 'maasai', letter: 'M', accent: '#C0562E', pattern: 'stripes' },
  { slug: 'dogon', letter: 'D', accent: '#8C5A3C', pattern: 'grid' },
  { slug: 'san-khoikhoi', letter: 'S', accent: '#B9773A', pattern: 'dots' },
  { slug: 'kuba', letter: 'K', accent: '#9C4A2E', pattern: 'diamonds' },
  { slug: 'tonga', letter: 'T', accent: '#A9682F', pattern: 'waves' },
  { slug: 'igbo', letter: 'I', accent: '#7C4A2E', pattern: 'rings' },
  { slug: 'xhosa', letter: 'X', accent: '#A34F31', pattern: 'radial' },
  { slug: 'mandinka', letter: 'M', accent: '#B8742C', pattern: 'chevrons' },
  { slug: 'kikuyu', letter: 'K', accent: '#BF6A2F', pattern: 'dots' },
  { slug: 'amhara', letter: 'A', accent: '#8E4B2A', pattern: 'grid' },
  { slug: 'oromo', letter: 'O', accent: '#A85E2C', pattern: 'stripes' },
  { slug: 'hausa', letter: 'H', accent: '#B1813A', pattern: 'diamonds' },
];

function monogram(letter, color) {
  return strokePath(
    letterPaths[letter],
    color,
    13,
    'stroke-linecap="square" stroke-linejoin="miter"',
  );
}

function markPattern(kind, color) {
  const out = [];
  switch (kind) {
    case 'radial': {
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * Math.PI * 2;
        out.push(line(300, 300, 300 + Math.cos(a) * 420, 300 + Math.sin(a) * 420, color, 5));
      }
      break;
    }
    case 'rings': {
      for (let i = 0; i < 7; i += 1) {
        out.push(
          circle(300, 300, 60 + i * 34, 'none').replace(
            'fill="none"',
            `fill="none" stroke="${color}" stroke-width="4"`,
          ),
        );
      }
      break;
    }
    case 'chevrons': {
      for (let i = 0; i < 13; i += 1) {
        out.push(
          strokePath(`M ${-40 + i * 60} 620 L ${10 + i * 60} 500 L ${60 + i * 60} 620`, color, 6),
        );
      }
      break;
    }
    case 'web': {
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        out.push(line(300, 300, 300 + Math.cos(a) * 420, 300 + Math.sin(a) * 420, color, 4));
      }
      for (let ring = 1; ring <= 3; ring += 1) {
        out.push(
          circle(300, 300, ring * 70, 'none').replace(
            'fill="none"',
            `fill="none" stroke="${color}" stroke-width="4"`,
          ),
        );
      }
      break;
    }
    case 'stripes': {
      for (let i = 0; i < 15; i += 1) {
        out.push(rect(i * 44, -20, 20, 640, color));
      }
      break;
    }
    case 'grid': {
      for (let i = 0; i < 9; i += 1) {
        out.push(line(0, 60 + i * 60, 600, 60 + i * 60, color, 3));
        out.push(line(60 + i * 60, 0, 60 + i * 60, 600, color, 3));
      }
      break;
    }
    case 'dots': {
      for (let i = 0; i < 9; i += 1) {
        for (let j = 0; j < 9; j += 1) {
          out.push(circle(60 + i * 60, 60 + j * 60, 5, color));
        }
      }
      break;
    }
    case 'diamonds': {
      for (let i = 0; i < 7; i += 1) {
        for (let j = 0; j < 7; j += 1) {
          out.push(
            poly(
              [
                [60 + i * 80, 30 + j * 80],
                [80 + i * 80, 60 + j * 80],
                [60 + i * 80, 90 + j * 80],
                [40 + i * 80, 60 + j * 80],
              ],
              color,
            ),
          );
        }
      }
      break;
    }
    case 'waves': {
      for (let i = 0; i < 10; i += 1) {
        out.push(
          strokePath(
            `M -20 ${60 + i * 56} Q 60 ${20 + i * 56} 140 ${60 + i * 56} T 300 ${60 + i * 56} T 460 ${60 + i * 56} T 620 ${60 + i * 56}`,
            color,
            5,
          ),
        );
      }
      break;
    }
    default:
      break;
  }
  return g(out, '');
}

function frame(kind, accentDark) {
  switch (kind) {
    case 'circle':
      return circle(300, 300, 244, 'none').replace(
        'fill="none"',
        `fill="none" stroke="${C.paper}" stroke-width="6"`,
      );
    case 'double':
      return (
        circle(300, 300, 250, 'none').replace(
          'fill="none"',
          `fill="none" stroke="${C.paper}" stroke-width="4"`,
        ) +
        circle(300, 300, 214, 'none').replace(
          'fill="none"',
          `fill="none" stroke="${C.paper}" stroke-width="2"`,
        )
      );
    case 'shield':
      return path(
        'M 300 62 L 512 132 C 512 320, 440 460, 300 540 C 160 460, 88 320, 88 132 Z',
        'none',
        `stroke="${C.paper}" stroke-width="6"`,
      );
    case 'square':
      return rect(72, 72, 456, 456, 'none', 42).replace(
        'fill="none"',
        `fill="none" stroke="${C.paper}" stroke-width="6"`,
      );
    case 'octagon':
      return poly(
        [
          [206, 70],
          [394, 70],
          [530, 206],
          [530, 394],
          [394, 530],
          [206, 530],
          [70, 394],
          [70, 206],
        ],
        'none',
        `stroke="${C.paper}" stroke-width="6"`,
      );
    default:
      return '';
  }
}

const markFrames = ['circle', 'shield', 'square', 'octagon', 'double'];

function publicationMark(tribe, index) {
  const fill = tribe.accent;
  // darken the accent for the subtle pattern
  const darken = (hex, amount) => {
    const n = hex.replace('#', '');
    const channel = (offset) => {
      const value = parseInt(n.slice(offset, offset + 2), 16);
      return Math.round(value * (1 - amount))
        .toString(16)
        .padStart(2, '0');
    };
    return `#${channel(0)}${channel(2)}${channel(4)}`;
  };
  const patternColor = darken(fill, 0.28);
  const frameMark = markFrames[index % markFrames.length];
  return svgDoc(
    600,
    600,
    scene([
      rect(0, 0, 600, 600, fill),
      markPattern(tribe.pattern, patternColor),
      // paper inset ring + frame
      circle(300, 300, 268, 'none').replace(
        'fill="none"',
        `fill="none" stroke="${C.paper}" stroke-width="2"`,
      ),
      frame(frameMark, patternColor),
      // monogram
      `<g transform="translate(300 300) scale(3.1) translate(-50 -50)">${monogram(tribe.letter, C.paper)}</g>`,
      // accent details
      star(300, 520, 13, C.saffron),
      star(300, 80, 9, C.saffron),
      circle(300, 520, 4, C.paper),
      circle(300, 80, 3, C.paper),
    ]),
  );
}

/* ---------------------------------------------------------------------------------------------
 * Write everything
 * ------------------------------------------------------------------------------------------- */
mkdirSync(OUT, { recursive: true });

let count = 0;
for (const [slug, render] of Object.entries(covers)) {
  writeFileSync(join(OUT, `${slug}.svg`), svgDoc(1200, 800, render()));
  count += 1;
}
for (const [index, tribe] of tribes.entries()) {
  writeFileSync(join(OUT, `publication-${tribe.slug}.svg`), publicationMark(tribe, index));
  count += 1;
}
console.log(
  `Wrote ${count} SVGs to apps/web/public/covers/ (${Object.keys(covers).length} covers, ${tribes.length} marks).`,
);
