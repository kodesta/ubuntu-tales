import { beforeEach, describe, expect, it, vi } from 'vitest';

import { filterSavedEntries } from '@/features/saved/savedFilters';

// Pure-logic coverage for the offline filter; the download manager is exercised in e2e because it
// needs IndexedDB + Cache Storage.

describe('offline saved filter', () => {
  const entries = [
    { story: { slug: 'downloaded' } },
    { story: { slug: 'not-downloaded' } },
  ] as never[];

  it('keeps only downloaded tales for filter=offline', () => {
    const result = filterSavedEntries(entries, 'offline', {}, new Set(['downloaded']));
    expect(result.map((entry) => entry.story.slug)).toEqual(['downloaded']);
  });

  it('returns nothing when downloads exist for no saved tale', () => {
    expect(filterSavedEntries(entries, 'offline', {}, new Set())).toEqual([]);
  });

  it('leaves all/in-progress behaviour unchanged', () => {
    expect(filterSavedEntries(entries, 'all', {}).length).toBe(2);
    expect(filterSavedEntries(entries, 'in-progress', {}).length).toBe(0);
  });
});

describe('device id', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
  });

  it('is stable and prefixed', async () => {
    const { getDeviceId } = await import('@/lib/device-id');
    const first = getDeviceId();
    expect(first.startsWith('web-')).toBe(true);
    expect(getDeviceId()).toBe(first);
  });
});
