import { beforeEach, describe, expect, it } from 'vitest';

import { isOnboarded, useOnboardingStore } from './onboarding';

describe('onboarding store (ut.onboarded)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useOnboardingStore.setState({ onboarded: false });
  });

  it('persists the first-visit flag through the store', () => {
    expect(isOnboarded()).toBe(false);
    useOnboardingStore.getState().complete();
    expect(isOnboarded()).toBe(true);
    expect(window.localStorage.getItem('ut.onboarded')).toContain('"onboarded":true');
  });

  it('accepts a raw "true" value (QA and deep-link friendly)', () => {
    window.localStorage.setItem('ut.onboarded', 'true');
    expect(isOnboarded()).toBe(true);
  });
});
