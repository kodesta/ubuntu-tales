/**
 * Editorial date, time and count formatting. All copy is English (Phase 1, see DEVIATIONS.md).
 */
const LOCALE = 'en-GB';

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Friday, 14 November" — the home header eyebrow (the comma is editorial, not locale). */
export function formatLongDate(value: Date | string | number): string {
  const date = toDate(value);
  const weekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(date);
  const day = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' }).format(date);
  return `${weekday}, ${day}`;
}

/** "14 Nov 2026" — row and card metadata. */
export function formatShortDate(value: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(toDate(value));
}

/** "November 2026" — archive group headers. */
export function formatMonthYear(value: Date | string | number): string {
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(
    toDate(value),
  );
}

/** "Today", "Yesterday", "3 days ago" — quiet relative metadata. */
export function formatRelativeDate(
  value: Date | string | number,
  now: Date = new Date(),
): string {
  const date = toDate(value);
  const startOfDay = (input: Date) =>
    new Date(input.getFullYear(), input.getMonth(), input.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days === -1) return 'Tomorrow';
  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  if (Math.abs(days) < 30) return formatter.format(-days, 'day');
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(-months, 'month');
  return formatter.format(-Math.round(days / 365), 'year');
}

/** "6 min read". */
export function formatReadTime(minutes: number): string {
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 1;
  return `${safe} min read`;
}

/** "12.4k" / "1.2m" — compact reader counts. */
export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value < 1000) return String(Math.round(value));
  return new Intl.NumberFormat(LOCALE, {
    notation: 'compact',
    maximumFractionDigits: 1,
  })
    .format(value)
    .toLowerCase()
    .replace(' ', '');
}

/** "12.4k readers". */
export function formatReaderCount(value: number): string {
  return `${formatCompactNumber(value)} reader${value === 1 ? '' : 's'}`;
}

/** "3 tales" / "1 tale". */
export function formatTaleCount(value: number): string {
  return `${value} tale${value === 1 ? '' : 's'}`;
}

/** Joins non-empty fragments with an editorial middot. */
export function joinMeta(parts: Array<string | undefined | null | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
