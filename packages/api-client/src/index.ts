import type {
  ApiErrorBody,
  AuthorDetail,
  AuthorSummary,
  CategorySummary,
  HomeResponse,
  LibraryTab,
  Paginated,
  PublicConfig,
  Region,
  SearchSuggestion,
  StoryCard,
  StoryDetail,
  StoryListQuery,
  TribeDetail,
  TribeListQuery,
  TribeSummary,
} from '@ubuntu-tales/shared';

/**
 * Typed HTTP client for the Ubuntu Tales API.
 *
 * NOTE (Phase 1 deviation): the production plan generates this package with orval from the
 * OpenAPI document (roadmap task 0.8). Until the API exposes a stable document and codegen is
 * wired, this package is a small, fully typed hand-written client over @ubuntu-tales/shared DTOs.
 * Keep it the only place that knows about URLs and fetch options.
 */

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface LibraryQuery {
  q?: string;
  category?: string;
  tribe?: string;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export interface HomeQuery {
  /** Guest personalisation: the tribe slug stored locally until accounts exist (Phase 2). */
  tribe?: string;
  signal?: AbortSignal;
}

type QueryValue = string | number | boolean | undefined | null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.detail || body.title);
    this.name = 'ApiError';
  }

  get code(): string {
    return this.body.code;
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export interface ApiClient {
  getConfig(opts?: RequestOptions): Promise<PublicConfig>;
  getHome(query?: HomeQuery): Promise<HomeResponse>;
  getTribe(slug: string, opts?: RequestOptions): Promise<TribeDetail>;
  getTribes(query?: TribeListQuery & RequestOptions): Promise<TribeSummary[]>;
  getCategories(opts?: RequestOptions): Promise<CategorySummary[]>;
  getStories(query?: StoryListQuery & RequestOptions): Promise<Paginated<StoryCard>>;
  getSearchSuggestions(q: string, opts?: RequestOptions): Promise<SearchSuggestion[]>;
  getStory(slug: string, opts?: RequestOptions): Promise<StoryDetail>;
  getRecommendations(slug: string, opts?: RequestOptions): Promise<StoryCard[]>;
  getLibrary(
    tab: Exclude<LibraryTab, 'authors'>,
    query?: LibraryQuery & RequestOptions,
  ): Promise<Paginated<StoryCard>>;
  getVoices(query?: LibraryQuery & RequestOptions): Promise<Paginated<AuthorSummary>>;
  getAuthor(slug: string, opts?: RequestOptions): Promise<AuthorDetail>;
  getStoryOfTheDay(opts?: RequestOptions): Promise<StoryCard>;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

export function createApiClient({
  baseUrl = '/api/v1',
  fetchImpl,
}: ApiClientOptions = {}): ApiClient {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => fetch(input, init));

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await doFetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });

    if (!response.ok) {
      let body: ApiErrorBody;
      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        body = {
          type: 'about:blank',
          title: 'Request failed',
          status: response.status,
          detail: response.statusText || 'The request could not be completed.',
          code: 'INTERNAL_ERROR',
        };
      }
      throw new ApiError(response.status, body);
    }

    return (await response.json()) as T;
  }

  return {
    getConfig: (opts) => request('/config', opts),

    getHome: (query = {}) =>
      request(`/home${buildQuery({ tribe: query.tribe })}`, { signal: query.signal }),

    getTribe: (slug, opts) => request(`/tribes/${encodeURIComponent(slug)}`, opts),

    getTribes: (query = {}) =>
      request<TribeSummary[]>(
        `/tribes${buildQuery({ q: query.q, region: query.region as Region | undefined })}`,
        { signal: query.signal },
      ),

    getCategories: (opts) => request<CategorySummary[]>('/categories', opts),

    getStories: (query = {}) =>
      request<Paginated<StoryCard>>(
        `/stories${buildQuery({
          q: query.q,
          tribe: query.tribe,
          category: query.category,
          region: query.region,
          sort: query.sort,
          limit: query.limit,
          cursor: query.cursor,
        })}`,
        { signal: query.signal },
      ),

    getSearchSuggestions: (q, opts) =>
      request<SearchSuggestion[]>(`/stories/search-suggestions${buildQuery({ q })}`, opts),

    getStory: (slug, opts) => request<StoryDetail>(`/stories/${encodeURIComponent(slug)}`, opts),

    getRecommendations: (slug, opts) =>
      request<StoryCard[]>(`/stories/${encodeURIComponent(slug)}/recommendations`, opts),

    getLibrary: (tab, query = {}) =>
      request<Paginated<StoryCard>>(
        `/library/${tab}${buildQuery({
          q: query.q,
          category: query.category,
          tribe: query.tribe,
          limit: query.limit,
          cursor: query.cursor,
        })}`,
        { signal: query.signal },
      ),

    getVoices: (query = {}) =>
      request<Paginated<AuthorSummary>>(
        `/authors${buildQuery({
          q: query.q,
          limit: query.limit,
          cursor: query.cursor,
        })}`,
        { signal: query.signal },
      ),

    getAuthor: (slug, opts) => request<AuthorDetail>(`/authors/${encodeURIComponent(slug)}`, opts),

    getStoryOfTheDay: (opts) => request<StoryCard>('/stories/story-of-the-day', opts),
  };
}

export { buildQuery };
