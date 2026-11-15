import type { CommunityRole, ReactionType } from './domain';

export const APP_NAME = 'Ubuntu Tales';
export const APP_TAGLINE = 'A person is a person through other persons.';

export const LOW_STORY_THRESHOLD = 5;
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;
export const WORDS_PER_MINUTE = 200;

export const REGIONS = [
  'NORTH_AFRICA',
  'WEST_AFRICA',
  'CENTRAL_AFRICA',
  'EAST_AFRICA',
  'SOUTHERN_AFRICA',
] as const;

export const REGION_LABELS: Record<(typeof REGIONS)[number], string> = {
  NORTH_AFRICA: 'North Africa',
  WEST_AFRICA: 'West Africa',
  CENTRAL_AFRICA: 'Central Africa',
  EAST_AFRICA: 'East Africa',
  SOUTHERN_AFRICA: 'Southern Africa',
};

export const STORY_SORTS = ['recent', 'popular', 'title'] as const;
export const LIBRARY_TABS = ['stories', 'audio', 'authors'] as const;
export const SAVED_FILTERS = ['all', 'in-progress', 'offline'] as const;

export const REACTIONS: {
  type: ReactionType;
  label: string;
  emoji: string;
  meaning: string;
}[] = [
  { type: 'JOY', label: 'Joy', emoji: '🌞', meaning: 'This tale made my spirit bright.' },
  { type: 'GREAT', label: 'Great', emoji: '🔥', meaning: 'A story worth passing on.' },
  { type: 'GOOD', label: 'Good', emoji: '🌿', meaning: 'A quiet, good read.' },
  { type: 'THINKING', label: 'Thinking', emoji: '🌙', meaning: 'It left me with a question.' },
  { type: 'HAPPY', label: 'Happy', emoji: '✨', meaning: 'A smile that stayed with me.' },
];

export const COMMUNITY_ROLES: {
  value: CommunityRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'STORYTELLER',
    label: 'Storyteller',
    description: 'I carry tales and love to share them.',
  },
  { value: 'SEEKER', label: 'Seeker', description: 'I am here to listen and learn.' },
  { value: 'WRITER', label: 'Writer', description: 'I write and retell the old stories.' },
  {
    value: 'STORYTELLER_AND_SEEKER',
    label: 'Storyteller & Seeker',
    description: 'A little of both: I tell and I listen.',
  },
  {
    value: 'ELDER_GUARDIAN',
    label: 'Elder / Guardian',
    description: 'I keep the memory of my people.',
  },
];

export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en'] as const;
