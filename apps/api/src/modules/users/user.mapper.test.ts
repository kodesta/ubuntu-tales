import { describe, expect, it } from 'vitest';
import type { TribeRow } from '../../catalogue/catalogue.mapper';
import { toUserMe, toUserStatsSummary, type UserRow } from './user.mapper';

const TRIBE: TribeRow = {
  id: '0190a0b0-0000-7000-8000-000000000010',
  slug: 'ashanti',
  name: 'Ashanti',
  region: 'WEST_AFRICA',
  countriesLabel: 'Ghana',
  tagline: 'Golden stools and quiet wisdom.',
  description: 'The Ashanti publication.',
  accentColor: '#B4552D',
  themeVariant: 'ashanti',
  imageUrl: '/covers/publication-ashanti.svg',
  imageAlt: 'Ashanti monogram',
  imageAccent: '#B4552D',
  subscriberCount: 1200,
  publishedStoryCount: 4,
};

function makeUser(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: '0190a0b0-0000-7000-8000-000000000001',
    email: 'kwame@ubuntutales.local',
    emailVerifiedAt: new Date('2026-01-02T03:04:05.000Z'),
    displayName: 'Kwame Mensah',
    customLineage: null,
    lineageLabel: null,
    communityRole: 'STORYTELLER',
    systemRole: 'READER',
    locale: 'en',
    onboardedAt: new Date('2026-01-02T03:04:05.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    tribe: TRIBE,
    stats: { talesRead: 7, tribesExplored: 3, listeningSeconds: 125, currentStreakDays: 5 },
    ...overrides,
  };
}

describe('toUserStatsSummary', () => {
  it('floors listening seconds to whole minutes', () => {
    expect(
      toUserStatsSummary({
        talesRead: 1,
        tribesExplored: 2,
        listeningSeconds: 125,
        currentStreakDays: 3,
      }),
    ).toEqual({ talesRead: 1, tribesExplored: 2, listeningMinutes: 2, currentStreakDays: 3 });
  });

  it('defaults to zeroes when stats are missing', () => {
    expect(toUserStatsSummary(null)).toEqual({
      talesRead: 0,
      tribesExplored: 0,
      listeningMinutes: 0,
      currentStreakDays: 0,
    });
  });
});

describe('toUserMe', () => {
  it('maps the full profile with tribe, stats and ISO timestamps', () => {
    const me = toUserMe(makeUser());

    expect(me.id).toBe('0190a0b0-0000-7000-8000-000000000001');
    expect(me.email).toBe('kwame@ubuntutales.local');
    expect(me.emailVerified).toBe(true);
    expect(me.displayName).toBe('Kwame Mensah');
    expect(me.systemRole).toBe('READER');
    expect(me.communityRole).toBe('STORYTELLER');
    expect(me.locale).toBe('en');
    expect(me.onboarded).toBe(true);
    expect(me.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(me.stats).toEqual({
      talesRead: 7,
      tribesExplored: 3,
      listeningMinutes: 2,
      currentStreakDays: 5,
    });
    expect(me.tribe).toMatchObject({
      id: TRIBE.id,
      slug: 'ashanti',
      name: 'Ashanti',
      publishedStoryCount: 4,
      accentColor: '#B4552D',
    });
    // Avatar initials are a frontend concern — the contract has no avatar in this slice.
    expect(me.avatar).toBeUndefined();
  });

  it('omits optional fields when absent and reflects unverified/not-onboarded accounts', () => {
    const me = toUserMe(
      makeUser({
        tribe: null,
        communityRole: null,
        emailVerifiedAt: null,
        onboardedAt: null,
      }),
    );

    expect(me.emailVerified).toBe(false);
    expect(me.onboarded).toBe(false);
    expect(me.tribe).toBeUndefined();
    expect(me.communityRole).toBeUndefined();
    expect(me.customLineage).toBeUndefined();
    expect(me.lineageLabel).toBeUndefined();
  });

  it('includes custom lineage and lineage label when present', () => {
    const me = toUserMe(
      makeUser({
        tribe: null,
        customLineage: 'Ashanti & Yoruba',
        lineageLabel: 'Ashanti & Yoruba Lineage',
        communityRole: null,
      }),
    );

    expect(me.tribe).toBeUndefined();
    expect(me.customLineage).toBe('Ashanti & Yoruba');
    expect(me.lineageLabel).toBe('Ashanti & Yoruba Lineage');
  });
});
