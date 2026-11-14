import { beforeEach, describe, expect, it } from 'vitest';

import { useFollowsStore } from './follows';

function reset() {
  window.localStorage.clear();
  useFollowsStore.setState({ slugs: [] });
}

describe('follows store (ut.follows)', () => {
  beforeEach(reset);

  it('toggles a follow and persists the slug', () => {
    const following = useFollowsStore.getState().toggle('zulu');
    expect(following).toBe(true);
    expect(useFollowsStore.getState().slugs).toEqual(['zulu']);
    expect(window.localStorage.getItem('ut.follows')).toContain('zulu');

    const followingAgain = useFollowsStore.getState().toggle('zulu');
    expect(followingAgain).toBe(false);
    expect(useFollowsStore.getState().slugs).toEqual([]);
  });

  it('is idempotent for repeated follows', () => {
    useFollowsStore.getState().follow('yoruba');
    useFollowsStore.getState().follow('yoruba');
    expect(useFollowsStore.getState().slugs).toEqual(['yoruba']);
  });
});
