import type { StoryBody } from './story-body';

export type Region =
  | 'NORTH_AFRICA'
  | 'WEST_AFRICA'
  | 'CENTRAL_AFRICA'
  | 'EAST_AFRICA'
  | 'SOUTHERN_AFRICA';

export type AccessLevel = 'FREE' | 'PREMIUM';
export type StoryStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ReactionType = 'JOY' | 'GREAT' | 'GOOD' | 'THINKING' | 'HAPPY';
export type CommunityRole =
  | 'STORYTELLER'
  | 'SEEKER'
  | 'WRITER'
  | 'STORYTELLER_AND_SEEKER'
  | 'ELDER_GUARDIAN';
export type StorySort = 'recent' | 'popular' | 'title';
export type LibraryTab = 'stories' | 'audio' | 'authors';
export type SavedFilter = 'all' | 'in-progress' | 'offline';
export type SearchSuggestionType = 'story' | 'tribe';

/** Per-viewer overlay on a story card. Only present when the request is authenticated. */
export interface StoryViewerState {
  saved: boolean;
  progressPercent: number;
  completed: boolean;
  reaction?: ReactionType | null;
}

/** A responsive image reference. Phase 1 serves local static artwork; Phase 3 swaps in CDN renditions. */
export interface ImageRef {
  url: string;
  srcset?: string;
  width?: number;
  height?: number;
  alt?: string;
  blurhash?: string;
  /** Hex accent sampled from the artwork, used for placeholders and publication chrome. */
  accent?: string;
}

export interface CategorySummary {
  id?: string;
  slug: string;
  name: string;
  badge: string;
}

export interface TribeSummary {
  id: string;
  slug: string;
  name: string;
  region: Region;
  countriesLabel: string;
  /** Editorial line shown under the publication masthead. */
  tagline?: string;
  description?: string;
  /** Publication accent, e.g. "#B4552D". */
  accentColor: string;
  image?: ImageRef;
  publishedStoryCount: number;
  /** Presentation-only follower count for the publication page. */
  subscriberCount: number;
  themeVariant?: string;
}

export interface NarratorSummary {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  roleLabel?: string;
  avatar?: ImageRef;
  accentColor?: string;
}

export interface StoryCard {
  id: string;
  slug: string;
  title: string;
  /** The dek/subtitle shown under the title. */
  summary: string;
  moral?: string;
  category: CategorySummary;
  tribe: {
    id: string;
    slug: string;
    name: string;
    accentColor?: string;
  };
  regionLabel: string;
  readTimeMinutes: number;
  hasAudio: boolean;
  audioDurationMinutes?: number;
  cover: ImageRef;
  /** ISO 8601 UTC. */
  publishedAt: string;
  narrator?: NarratorSummary;
  isFeatured?: boolean;
  /** Present only for authenticated requests (optional auth). */
  viewer?: StoryViewerState;
}

export interface StoryDetail extends StoryCard {
  body: StoryBody;
  attribution?: string;
  sourceNotes?: string;
}

export interface TribeDetail extends TribeSummary {
  featuredStories: StoryCard[];
  latestStories: StoryCard[];
}

export interface WisdomNote {
  id: string;
  quote: string;
  storySlug: string;
  storyTitle: string;
  tribeName: string;
}

export interface HomeResponse {
  storyOfTheDay: StoryCard;
  /** Newest tales across all publications — the reading feed. */
  latest: StoryCard[];
  yourTribe?: {
    tribe: TribeSummary;
    stories: StoryCard[];
  };
  categories: CategorySummary[];
  wisdomNotes: WisdomNote[];
  popular: StoryCard[];
}

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
  total?: number;
}

export interface SearchSuggestion {
  type: SearchSuggestionType;
  slug: string;
  label: string;
  hint?: string;
}

export interface AuthorDetail {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  roleLabel?: string;
  avatar?: ImageRef;
  accentColor?: string;
  publishedStoryCount: number;
  stories: StoryCard[];
}

export interface ReactionDefinition {
  type: ReactionType;
  label: string;
  emoji: string;
  meaning: string;
}

export interface CommunityRoleDefinition {
  value: CommunityRole;
  label: string;
  description: string;
}

export interface PublicConfig {
  appName: string;
  tagline: string;
  lowStoryThreshold: number;
  supportedLocales: string[];
  reactions: ReactionDefinition[];
  communityRoles: CommunityRoleDefinition[];
}

export interface StoryListQuery {
  q?: string;
  tribe?: string;
  category?: string;
  region?: Region;
  sort?: StorySort;
  limit?: number;
  cursor?: string;
}

export interface TribeListQuery {
  q?: string;
  region?: Region;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

/** RFC 9457 Problem Details, as emitted by the API. */
export interface ApiErrorBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  errors?: ApiFieldError[];
}

export interface AuthorSummary {
  id: string;
  slug: string;
  name: string;
  bio?: string;
  roleLabel?: string;
  avatar?: ImageRef;
  accentColor?: string;
  publishedStoryCount: number;
  tribeNames?: string[];
}
