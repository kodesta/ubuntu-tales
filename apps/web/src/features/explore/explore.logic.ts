import type { ExplorePoint, Region } from '@ubuntu-tales/shared';

/** Publications visible for the current region filter (empty = all). */
export function visiblePoints(points: ExplorePoint[], region: Region | ''): ExplorePoint[] {
  if (!region) return points;
  return points.filter((point) => point.tribe.region === region);
}

/** Pin radius grows with the number of tales, within a readable range. */
export function pinRadius(storyCount: number): number {
  return Math.min(14, 6 + storyCount * 1.6);
}

/** Total tales represented by the visible points. */
export function totalStories(points: ExplorePoint[]): number {
  return points.reduce((total, point) => total + point.storyCount, 0);
}

/** Keeps a valid selection after the filter changes; prefers the current one when still visible. */
export function resolveSelection(
  points: ExplorePoint[],
  currentSlug: string | null,
): string | null {
  if (points.length === 0) return null;
  if (currentSlug && points.some((point) => point.tribe.slug === currentSlug)) return currentSlug;
  return points[0]?.tribe.slug ?? null;
}
