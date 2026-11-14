import type { CategorySummary, ImageRef, StoryCard, TribeSummary, WisdomNote } from '@ubuntu-tales/shared';

/**
 * Local fixtures for component tests and the DEV-only `/__ui` gallery.
 * Never used by production routes — real data always comes from the API.
 */
function coverSvg(accent: string, secondary = '#8c5a3c'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#fbf7f0"/><circle cx="900" cy="240" r="150" fill="${accent}"/><path d="M0 660 L320 430 L560 660 Z" fill="${secondary}"/><path d="M240 720 L600 470 L900 720 Z" fill="${accent}" opacity="0.72"/><rect x="120" y="540" width="36" height="160" fill="#2f5d4e"/><path d="M104 540 L156 540 L138 470 Z" fill="#2f5d4e"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const sampleCover: ImageRef = {
  url: coverSvg('#b4472c'),
  alt: 'Layered geometric baobab silhouettes at dusk',
  width: 1200,
  height: 800,
  accent: '#b4472c',
};

export const sampleCategory: CategorySummary = {
  id: 'cat-wisdom',
  slug: 'wisdom',
  name: 'Wisdom tales',
  badge: 'WISDOM TALE',
};

export const sampleTribe: TribeSummary = {
  id: 'tribe-zulu',
  slug: 'zulu',
  name: 'Zulu',
  region: 'SOUTHERN_AFRICA',
  countriesLabel: 'South Africa',
  tagline: 'Voices from the eastern grasslands.',
  description:
    'Tales carried across the eastern grasslands of southern Africa, where the cattle are counted and the old stories are still told after dark.',
  accentColor: '#b4472c',
  image: {
    url: coverSvg('#b4472c', '#2f5d4e'),
    alt: 'Publication mark for the Zulu tales',
    width: 600,
    height: 600,
    accent: '#b4472c',
  },
  publishedStoryCount: 7,
  subscriberCount: 12400,
  themeVariant: 'grassland',
};

export const sampleTribeTwo: TribeSummary = {
  ...sampleTribe,
  id: 'tribe-yoruba',
  slug: 'yoruba',
  name: 'Yoruba',
  region: 'WEST_AFRICA',
  countriesLabel: 'Nigeria · Benin',
  tagline: 'Tales of wit, gods and the market square.',
  accentColor: '#df9a2b',
  image: {
    url: coverSvg('#df9a2b', '#b4472c'),
    alt: 'Publication mark for the Yoruba tales',
    width: 600,
    height: 600,
    accent: '#df9a2b',
  },
  publishedStoryCount: 9,
  subscriberCount: 24800,
};

export const sampleStory: StoryCard = {
  id: 'story-baobab',
  slug: 'the-baobab-that-kept-its-promise',
  title: 'The Baobab That Kept Its Promise',
  summary:
    'When the rains failed, a young herder made a promise to the oldest tree on the plain. Seasons later, the tree remembered.',
  moral: 'A tree is known by its fruit, a person by their deeds.',
  category: sampleCategory,
  tribe: {
    id: sampleTribe.id,
    slug: sampleTribe.slug,
    name: sampleTribe.name,
    accentColor: sampleTribe.accentColor,
  },
  regionLabel: 'SOUTHERN AFRICA',
  readTimeMinutes: 6,
  hasAudio: false,
  cover: sampleCover,
  publishedAt: '2026-11-14T06:00:00.000Z',
  narrator: {
    id: 'narrator-thandiwe',
    slug: 'thandiwe-nkosi',
    name: 'Thandiwe Nkosi',
    roleLabel: 'Griot · KwaZulu-Natal',
    accentColor: '#b4472c',
  },
  isFeatured: true,
};

export const sampleStoryTwo: StoryCard = {
  ...sampleStory,
  id: 'story-hare',
  slug: 'the-hare-and-the-market-drum',
  title: 'The Hare and the Market Drum',
  summary:
    'A hare who could talk his way out of anything meets a drum that will not be talked out of its own beat.',
  category: {
    id: 'cat-trickster',
    slug: 'trickster',
    name: 'Trickster tales',
    badge: 'TRICKSTER TALE',
  },
  tribe: {
    id: sampleTribeTwo.id,
    slug: sampleTribeTwo.slug,
    name: sampleTribeTwo.name,
    accentColor: sampleTribeTwo.accentColor,
  },
  readTimeMinutes: 4,
  publishedAt: '2026-11-12T06:00:00.000Z',
  narrator: {
    id: 'narrator-ade',
    slug: 'ade-okonkwo',
    name: 'Ade Okonkwo',
    roleLabel: 'Griot · Lagos',
    accentColor: '#df9a2b',
  },
  isFeatured: false,
};

export const sampleStoryThree: StoryCard = {
  ...sampleStory,
  id: 'story-moon',
  slug: 'why-the-moon-walks-at-night',
  title: 'Why the Moon Walks at Night',
  summary:
    'In the first days, the moon and the sun shared the sky. Then a small goat made a very large mistake.',
  category: {
    id: 'cat-creation',
    slug: 'creation',
    name: 'Creation myths',
    badge: 'CREATION MYTH',
  },
  readTimeMinutes: 8,
  publishedAt: '2026-10-30T06:00:00.000Z',
  isFeatured: false,
};

export const sampleStories: StoryCard[] = [
  sampleStory,
  sampleStoryTwo,
  sampleStoryThree,
];

export const sampleWisdomNotes: WisdomNote[] = [
  {
    id: 'note-1',
    quote: 'A tree is known by its fruit, a person by their deeds.',
    storySlug: sampleStory.slug,
    storyTitle: sampleStory.title,
    tribeName: sampleTribe.name,
  },
  {
    id: 'note-2',
    quote: 'The drum does not choose who hears it, only who dances.',
    storySlug: sampleStoryTwo.slug,
    storyTitle: sampleStoryTwo.title,
    tribeName: sampleTribeTwo.name,
  },
];
