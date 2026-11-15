import type { ExplorePoint } from '@ubuntu-tales/shared';
import { describe, expect, it } from 'vitest';

import { pinRadius, resolveSelection, totalStories, visiblePoints } from './explore.logic';
import { AFRICA_VIEWBOX, projectToMap, WORLD_VIEWBOX } from './world-geometry';

function point(slug: string, region: ExplorePoint['tribe']['region'], storyCount = 1): ExplorePoint {
  return {
    tribe: {
      id: slug,
      slug,
      name: slug,
      region,
      countriesLabel: 'Place',
      accentColor: '#B4472C',
      publishedStoryCount: storyCount,
      subscriberCount: 0,
    },
    latitude: 0,
    longitude: 0,
    storyCount,
    featuredStories: [],
  };
}

const POINTS = [
  point('zulu', 'SOUTHERN_AFRICA', 2),
  point('yoruba', 'WEST_AFRICA', 2),
  point('ashanti', 'WEST_AFRICA', 1),
  point('maasai', 'EAST_AFRICA', 1),
];

describe('explore filters', () => {
  it('shows every point without a region filter', () => {
    expect(visiblePoints(POINTS, '')).toHaveLength(4);
  });

  it('narrows to a single region', () => {
    const west = visiblePoints(POINTS, 'WEST_AFRICA');
    expect(west.map((entry) => entry.tribe.slug)).toEqual(['yoruba', 'ashanti']);
    expect(visiblePoints(POINTS, 'NORTH_AFRICA')).toHaveLength(0);
  });

  it('sums tales across visible points', () => {
    expect(totalStories(POINTS)).toBe(6);
    expect(totalStories(visiblePoints(POINTS, 'WEST_AFRICA'))).toBe(3);
  });
});

describe('pin sizing and selection', () => {
  it('grows pins with story count but stays bounded', () => {
    expect(pinRadius(1)).toBeCloseTo(7.6);
    expect(pinRadius(2)).toBeCloseTo(9.2);
    expect(pinRadius(50)).toBe(14);
  });

  it('keeps a valid selection and falls back to the first pin', () => {
    expect(resolveSelection(POINTS, 'yoruba')).toBe('yoruba');
    expect(resolveSelection(POINTS, 'missing')).toBe('zulu');
    expect(resolveSelection([], 'zulu')).toBeNull();
  });
});

describe('map projection', () => {
  it('places (0,0) at the centre of the world viewBox', () => {
    expect(projectToMap(0, 0)).toEqual({ x: 500, y: 250 });
  });

  it('projects known coordinates consistently', () => {
    // KwaZulu-Natal sits south-east: x > centre, y > centre (south is down).
    const zulu = projectToMap(-28.5, 31.5);
    expect(zulu.x).toBeGreaterThan(500);
    expect(zulu.y).toBeGreaterThan(250);
    // The Gambia sits west: x < centre, y < centre (north is up).
    const gambia = projectToMap(13.4, -15.5);
    expect(gambia.x).toBeLessThan(500);
    expect(gambia.y).toBeLessThan(250);
  });

  it('exposes focused and world viewBoxes', () => {
    expect(WORLD_VIEWBOX).toBe('0 0 1000 500');
    expect(AFRICA_VIEWBOX.split(' ')).toHaveLength(4);
  });
});
