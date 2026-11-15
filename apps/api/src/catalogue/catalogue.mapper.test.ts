import { REGION_LABELS, type StoryBody } from '@ubuntu-tales/shared';
import { describe, expect, it } from 'vitest';
import {
  COVER_HEIGHT,
  COVER_WIDTH,
  toAuthorDetail,
  toAuthorSummary,
  toStoryCard,
  toStoryDetail,
  toTribeDetail,
  toTribeSummary,
  type CategoryRow,
  type NarratorRow,
  type StoryRow,
  type TribeRow,
} from './catalogue.mapper';

const BODY: StoryBody = {
  version: 1,
  paragraphs: [
    {
      id: 'p_01',
      sentences: [
        { id: 's_0001', text: 'Long ago, when the rivers were young, a baobab made a promise.' },
        { id: 's_0002', text: 'It kept it for a hundred seasons.' },
      ],
    },
  ],
};

const CATEGORY: CategoryRow = {
  id: 'cat-1',
  slug: 'wisdom',
  name: 'Wisdom tales',
  badge: 'WISDOM TALE',
};

const TRIBE: TribeRow = {
  id: 'tribe-1',
  slug: 'zulu',
  name: 'Zulu',
  region: 'SOUTHERN_AFRICA',
  countriesLabel: 'South Africa',
  tagline: 'Voices from the eastern grasslands.',
  description: 'Tales carried across the rolling hills of KwaZulu-Natal.',
  accentColor: '#B4472C',
  themeVariant: 'grassland',
  imageUrl: '/covers/publication-zulu.svg',
  imageAlt: 'Publication mark for the Zulu tales',
  imageAccent: '#B4472C',
  subscriberCount: 12400,
  publishedStoryCount: 3,
};

const NARRATOR: NarratorRow = {
  id: 'narrator-1',
  slug: 'thandiwe-nkosi',
  name: 'Thandiwe Nkosi',
  bio: 'A griot from the eastern grasslands.',
  roleLabel: 'Griot · KwaZulu-Natal',
  accentColor: '#B4472C',
  avatarUrl: null,
  avatarAlt: null,
  avatarAccent: null,
};

function makeStory(overrides: Partial<StoryRow> = {}): StoryRow {
  return {
    id: 'story-1',
    slug: 'the-baobab-that-kept-its-promise',
    title: 'The Baobab That Kept Its Promise',
    summary: 'A tree keeps a promise for a hundred seasons.',
    moral: 'A tree is known by its fruit, a person by their deeds.',
    body: BODY,
    wordCount: 812,
    readTimeMinutes: 5,
    regionLabel: 'SOUTHERN AFRICA',
    coverUrl: '/covers/the-baobab-that-kept-its-promise.svg',
    coverAlt: 'Layered geometric baobab silhouettes at dusk',
    coverAccent: '#B4552D',
    attribution: 'A traditional Zulu tale, retold for Ubuntu Tales.',
    isFeatured: true,
    publishedAt: new Date('2026-11-14T06:00:00.000Z'),
    createdAt: new Date('2026-11-13T00:00:00.000Z'),
    tribe: TRIBE,
    category: CATEGORY,
    narrator: NARRATOR,
    ...overrides,
  };
}

describe('catalogue mappers', () => {
  describe('toStoryCard', () => {
    it('maps a database story to the client contract', () => {
      const card = toStoryCard(makeStory());

      expect(card).toMatchObject({
        id: 'story-1',
        slug: 'the-baobab-that-kept-its-promise',
        title: 'The Baobab That Kept Its Promise',
        summary: 'A tree keeps a promise for a hundred seasons.',
        moral: 'A tree is known by its fruit, a person by their deeds.',
        regionLabel: 'SOUTHERN AFRICA',
        readTimeMinutes: 5,
        hasAudio: false,
        isFeatured: true,
        publishedAt: '2026-11-14T06:00:00.000Z',
      });

      expect(card.category).toEqual({
        id: 'cat-1',
        slug: 'wisdom',
        name: 'Wisdom tales',
        badge: 'WISDOM TALE',
      });
      expect(card.tribe).toEqual({
        id: 'tribe-1',
        slug: 'zulu',
        name: 'Zulu',
        accentColor: '#B4472C',
      });
      expect(card.cover).toEqual({
        url: '/covers/the-baobab-that-kept-its-promise.svg',
        alt: 'Layered geometric baobab silhouettes at dusk',
        accent: '#B4552D',
        width: COVER_WIDTH,
        height: COVER_HEIGHT,
      });
      expect(card.narrator).toMatchObject({
        id: 'narrator-1',
        slug: 'thandiwe-nkosi',
        name: 'Thandiwe Nkosi',
        roleLabel: 'Griot · KwaZulu-Natal',
      });
      expect(card.audioDurationMinutes).toBeUndefined();
    });

    it('falls back to the region label and createdAt when fields are missing', () => {
      const card = toStoryCard(
        makeStory({
          regionLabel: null,
          publishedAt: null,
          moral: null,
          narrator: null,
          isFeatured: false,
        }),
      );

      expect(card.regionLabel).toBe(REGION_LABELS.SOUTHERN_AFRICA);
      expect(card.publishedAt).toBe('2026-11-13T00:00:00.000Z');
      expect(card.moral).toBeUndefined();
      expect(card.narrator).toBeUndefined();
      expect(card.isFeatured).toBe(false);
    });
  });

  describe('toStoryDetail', () => {
    it('includes the validated body and attribution', () => {
      const detail = toStoryDetail(makeStory());

      expect(detail.body).toEqual(BODY);
      expect(detail.attribution).toBe('A traditional Zulu tale, retold for Ubuntu Tales.');
      expect(detail.title).toBe('The Baobab That Kept Its Promise');
    });

    it('throws when the stored body is not a valid StoryBody', () => {
      expect(() => toStoryDetail(makeStory({ body: { version: 2, paragraphs: [] } }))).toThrow(
        /not a valid StoryBody/,
      );
    });
  });

  describe('toTribeSummary / toTribeDetail', () => {
    it('maps the publication fields including the mark image', () => {
      const tribe = toTribeSummary(TRIBE);
      expect(tribe).toMatchObject({
        id: 'tribe-1',
        slug: 'zulu',
        region: 'SOUTHERN_AFRICA',
        countriesLabel: 'South Africa',
        accentColor: '#B4472C',
        publishedStoryCount: 3,
        subscriberCount: 12400,
        tagline: 'Voices from the eastern grasslands.',
      });
      expect(tribe.image).toMatchObject({
        url: '/covers/publication-zulu.svg',
        width: 600,
        height: 600,
        accent: '#B4472C',
      });
    });

    it('omits the image when the tribe has none', () => {
      const tribe = toTribeSummary({ ...TRIBE, imageUrl: null, imageAlt: null, imageAccent: null });
      expect(tribe.image).toBeUndefined();
    });

    it('composes featured and latest story cards', () => {
      const detail = toTribeDetail(TRIBE, [makeStory()], [makeStory({ id: 'story-2' })]);
      expect(detail.featuredStories).toHaveLength(1);
      expect(detail.latestStories).toHaveLength(1);
      expect(detail.latestStories[0]?.id).toBe('story-2');
    });
  });

  describe('authors', () => {
    it('maps a narrator summary with a published story count', () => {
      const author = toAuthorSummary(NARRATOR, 4, ['Zulu', 'Zulu', 'Yoruba']);
      expect(author).toMatchObject({
        id: 'narrator-1',
        slug: 'thandiwe-nkosi',
        name: 'Thandiwe Nkosi',
        publishedStoryCount: 4,
        tribeNames: ['Zulu', 'Yoruba'],
      });
      expect(author.avatar).toBeUndefined();
    });

    it('composes an author detail with story cards', () => {
      const detail = toAuthorDetail(NARRATOR, 1, [makeStory()]);
      expect(detail.stories).toHaveLength(1);
      expect(detail.stories[0]?.slug).toBe('the-baobab-that-kept-its-promise');
      expect(detail.publishedStoryCount).toBe(1);
    });
  });
});
