/**
 * Colour helpers for data-driven accents (publication marks, progress bars).
 * Accents arrive from the API as hex strings; we only ever choose between existing tokens so the
 * "tokens only" rule holds for component CSS.
 */
const PAPER_RAISED = 'var(--paper-raised)';
const INK = 'var(--ink)';

function parseHex(hex: string | undefined): [number, number, number] | null {
  if (!hex) return null;
  const value = hex.trim().replace('#', '');
  const expanded =
    value.length === 3
      ? value
          .split('')
          .map((part) => part + part)
          .join('')
      : value;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ];
}

function channelLuminance(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(hex: string | undefined): number | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb;
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/**
 * Picks an ink token that stays readable on top of a data-provided accent.
 * Light accents (saffron, sand) take ink; deep accents (terracotta, forest) take paper.
 */
export function readableInkOn(accent: string | undefined): string {
  const luminance = relativeLuminance(accent);
  if (luminance === null) return PAPER_RAISED;
  return luminance > 0.42 ? INK : PAPER_RAISED;
}
