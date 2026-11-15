import type {
  ApiErrorBody,
  AuthResponse,
  AuthorDetail,
  AuthorSummary,
  CategorySummary,
  ChangePasswordInput,
  CompleteResponse,
  ContinueReadingItem,
  ForgotPasswordResponse,
  HomeResponse,
  LibraryTab,
  LoginInput,
  MediaAssetSummary,
  MePatchInput,
  NarrationDetail,
  OkResponse,
  Paginated,
  OfflineBundle,
  ProgressInput,
  DownloadRequest,
  ProgressPutResponse,
  PublicConfig,
  ReactionSetResponse,
  ReactionSummary,
  ReactionType,
  Region,
  RegisterInput,
  SavedFilter,
  SavedStoryItem,
  SearchSuggestion,
  StoryCard,
  StoryDetail,
  StoryListQuery,
  TribeDetail,
  TribeListQuery,
  TribeSummary,
  UploadRequest,
  UploadTicket,
  UserMe,
  VerifyEmailResponse,
} from '@ubuntu-tales/shared';

/**
 * Typed HTTP client for the Ubuntu Tales API.
 *
 * NOTE (Phase 1 deviation, now with auth): the production plan generates this package with orval
 * from the OpenAPI document (roadmap task 0.8). Until the API exposes a stable document, this
 * package is a small, fully typed, hand-written client over @ubuntu-tales/shared DTOs. It is the
 * only place that knows about URLs, fetch options, bearer tokens and problem details.
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
  /** Guest personalisation is not used when signed in; the account tribe wins server-side. */
  tribe?: string;
  signal?: AbortSignal;
}

export interface SavedQuery {
  filter?: SavedFilter;
  deviceId?: string;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

export interface CursorQuery {
  limit?: number;
  cursor?: string;
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

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Send the in-memory bearer token. Defaults to true. */
  auth?: boolean;
  /** Skip the onUnauthorized refresh-and-retry hook (used by /auth/refresh itself). */
  skipUnauthorizedHandler?: boolean;
}

export interface ApiClient {
  auth: {
    register(input: RegisterInput): Promise<AuthResponse>;
    login(input: LoginInput): Promise<AuthResponse>;
    refresh(): Promise<AuthResponse>;
    logout(): Promise<OkResponse>;
    logoutAll(): Promise<OkResponse>;
    verifyEmail(token: string): Promise<VerifyEmailResponse>;
    resendVerification(): Promise<OkResponse>;
    forgotPassword(email: string): Promise<ForgotPasswordResponse>;
    resetPassword(token: string, newPassword: string): Promise<OkResponse>;
  };
  me: {
    get(opts?: RequestOptions): Promise<UserMe>;
    update(patch: MePatchInput): Promise<UserMe>;
    completeOnboarding(): Promise<UserMe>;
    changePassword(input: ChangePasswordInput): Promise<OkResponse>;
  };
  saved: {
    list(query?: SavedQuery): Promise<Paginated<SavedStoryItem>>;
    save(storyId: string): Promise<OkResponse>;
    unsave(storyId: string): Promise<OkResponse>;
  };
  progress: {
    put(storyId: string, input: ProgressInput): Promise<ProgressPutResponse>;
    complete(storyId: string): Promise<CompleteResponse>;
    list(query?: CursorQuery): Promise<Paginated<ContinueReadingItem>>;
  };
  reactions: {
    set(storyId: string, type: ReactionType): Promise<ReactionSetResponse>;
    remove(storyId: string): Promise<ReactionSetResponse>;
    summary(storyId: string, opts?: RequestOptions): Promise<ReactionSummary>;
  };
  narrations: {
    get(id: string, opts?: RequestOptions): Promise<NarrationDetail>;
  };
  uploads: {
    request(input: UploadRequest): Promise<UploadTicket>;
    complete(assetId: string): Promise<MediaAssetSummary>;
    status(assetId: string, opts?: RequestOptions): Promise<MediaAssetSummary>;
  };
  downloads: {
    add(storyId: string, body: DownloadRequest): Promise<{ ok: true }>;
    remove(storyId: string, deviceId: string): Promise<{ ok: true }>;
  };
  getOfflineBundle(
    slug: string,
    query?: { rendition?: 'aac_64k' | 'aac_128k'; signal?: AbortSignal },
  ): Promise<OfflineBundle>;
  getConfig(opts?: RequestOptions): Promise<PublicConfig>;
  admin: AdminClient;
  submissions: ContributorClient;
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
  /** Returns the short-lived access token held in memory by the web session store. */
  getAccessToken?: () => string | null;
  /**
   * Called once when a request fails with 401. Must return a fresh access token (single-flight
   * refresh lives in the web session store) or null when the session is over.
   */
  onUnauthorized?: () => Promise<string | null> | string | null;
}

export function createApiClient({
  baseUrl = '/api/v1',
  fetchImpl,
  getAccessToken,
  onUnauthorized,
}: ApiClientOptions = {}): ApiClient {
  const doFetch: FetchLike = fetchImpl ?? ((input, init) => fetch(input, init));

  function currentToken(): string | null {
    try {
      return getAccessToken?.() ?? null;
    } catch {
      return null;
    }
  }

  function send(
    path: string,
    config: RequestConfig,
    token: string | null,
  ): Promise<Response> {
    const query = config.query ? buildQuery(config.query) : '';
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(config.headers ?? {}),
    };
    if (config.body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    return doFetch(`${baseUrl}${path}${query}`, {
      method: config.method ?? 'GET',
      credentials: 'include',
      headers,
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      signal: config.signal,
    });
  }

  async function rawRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
    const useAuth = config.auth !== false;

    let response = await send(path, config, useAuth ? currentToken() : null);

    if (
      response.status === 401 &&
      useAuth &&
      !config.skipUnauthorizedHandler &&
      onUnauthorized
    ) {
      const refreshedToken = await onUnauthorized();
      if (refreshedToken) {
        response = await send(path, config, refreshedToken);
      }
    }

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

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  const cfg = (
    method: RequestConfig['method'],
    body?: unknown,
    extra: Partial<RequestConfig> = {},
  ): RequestConfig => ({ method, ...(body !== undefined ? { body } : {}), ...extra });

  return {
    auth: {
      register: (input) => rawRequest<AuthResponse>('/auth/register', cfg('POST', input, { auth: false })),
      login: (input) => rawRequest<AuthResponse>('/auth/login', cfg('POST', input, { auth: false })),
      refresh: () =>
        rawRequest<AuthResponse>(
          '/auth/refresh',
          cfg('POST', undefined, {
            auth: false,
            skipUnauthorizedHandler: true,
            headers: { 'X-Requested-With': 'ubuntu-tales' },
          }),
        ),
      logout: () => rawRequest<OkResponse>('/auth/logout', cfg('POST')),
      logoutAll: () => rawRequest<OkResponse>('/auth/logout-all', cfg('POST')),
      verifyEmail: (token) =>
        rawRequest<VerifyEmailResponse>('/auth/verify-email', cfg('POST', { token }, { auth: false })),
      resendVerification: () => rawRequest<OkResponse>('/auth/verify-email/resend', cfg('POST')),
      forgotPassword: (email) =>
        rawRequest<ForgotPasswordResponse>('/auth/password/forgot', cfg('POST', { email }, { auth: false })),
      resetPassword: (token, newPassword) =>
        rawRequest<OkResponse>(
          '/auth/password/reset',
          cfg('POST', { token, newPassword }, { auth: false }),
        ),
    },

    me: {
      get: (opts) => rawRequest<UserMe>('/me', { signal: opts?.signal }),
      update: (patch) => rawRequest<UserMe>('/me', cfg('PATCH', patch)),
      completeOnboarding: () => rawRequest<UserMe>('/me/onboarding/complete', cfg('POST')),
      changePassword: (input) => rawRequest<OkResponse>('/me/password', cfg('PUT', input)),
    },

    saved: {
      list: (query = {}) =>
        rawRequest<Paginated<SavedStoryItem>>(
          `/me/saved${buildQuery({
            filter: query.filter,
            deviceId: query.deviceId,
            limit: query.limit,
            cursor: query.cursor,
          })}`,
          { signal: query.signal },
        ),
      save: (storyId) =>
        rawRequest<OkResponse>(`/me/saved/${encodeURIComponent(storyId)}`, cfg('PUT')),
      unsave: (storyId) =>
        rawRequest<OkResponse>(`/me/saved/${encodeURIComponent(storyId)}`, cfg('DELETE')),
    },

    progress: {
      put: (storyId, input) =>
        rawRequest<ProgressPutResponse>(
          `/me/progress/${encodeURIComponent(storyId)}`,
          cfg('PUT', input),
        ),
      complete: (storyId) =>
        rawRequest<CompleteResponse>(
          `/me/progress/${encodeURIComponent(storyId)}/complete`,
          cfg('POST'),
        ),
      list: (query = {}) =>
        rawRequest<Paginated<ContinueReadingItem>>(
          `/me/progress${buildQuery({ limit: query.limit, cursor: query.cursor })}`,
          { signal: query.signal },
        ),
    },

    reactions: {
      set: (storyId, type) =>
        rawRequest<ReactionSetResponse>(
          `/stories/${encodeURIComponent(storyId)}/reactions`,
          cfg('PUT', { type }),
        ),
      remove: (storyId) =>
        rawRequest<ReactionSetResponse>(
          `/stories/${encodeURIComponent(storyId)}/reactions`,
          cfg('DELETE'),
        ),
      summary: (storyId, opts) =>
        rawRequest<ReactionSummary>(
          `/stories/${encodeURIComponent(storyId)}/reactions/summary`,
          { signal: opts?.signal },
        ),
    },

    narrations: {
      get: (id, opts) =>
        rawRequest<NarrationDetail>(`/narrations/${encodeURIComponent(id)}`, {
          signal: opts?.signal,
        }),
    },

    uploads: {
      request: (input) => rawRequest<UploadTicket>('/uploads', cfg('POST', input)),
      complete: (assetId) =>
        rawRequest<MediaAssetSummary>(
          `/uploads/${encodeURIComponent(assetId)}/complete`,
          cfg('POST'),
        ),
      status: (assetId, opts) =>
        rawRequest<MediaAssetSummary>(`/uploads/${encodeURIComponent(assetId)}`, {
          signal: opts?.signal,
        }),
    },

    downloads: {
      add: (storyId, body) =>
        rawRequest<{ ok: true }>(`/me/downloads/${encodeURIComponent(storyId)}`, cfg('POST', body)),
      remove: (storyId, deviceId) =>
        rawRequest<{ ok: true }>(
          `/me/downloads/${encodeURIComponent(storyId)}${buildQuery({ deviceId })}`,
          cfg('DELETE'),
        ),
    },

    getOfflineBundle: (slug, query = {}) =>
      rawRequest<OfflineBundle>(
        `/stories/${encodeURIComponent(slug)}/offline-bundle${buildQuery({
          rendition: query.rendition,
        })}`,
        { signal: query.signal },
      ),


    admin: {
      stories: {
        list: (query = {}) =>
          rawRequest<Paginated<AdminStorySummary>>(
            `/admin/stories${buildQuery({
              status: query.status,
              tribe: query.tribe,
              category: query.category,
              q: query.q,
              limit: query.limit,
              cursor: query.cursor,
            })}`,
            { signal: query.signal },
          ),
        get: (id, opts) => rawRequest<AdminStoryDetail>(`/admin/stories/${id}`, { signal: opts?.signal }),
        create: (input) => rawRequest<AdminStoryDetail>('/admin/stories', cfg('POST', input)),
        update: (id, input) => rawRequest<AdminStoryDetail>(`/admin/stories/${id}`, cfg('PATCH', input)),
        publish: (id) => rawRequest<PublishResponse>(`/admin/stories/${id}/publish`, cfg('POST')),
        unpublish: (id) => rawRequest<PublishResponse>(`/admin/stories/${id}/unpublish`, cfg('POST')),
        archive: (id) => rawRequest<PublishResponse>(`/admin/stories/${id}/archive`, cfg('POST')),
      },
      narrations: {
        list: (query = {}) =>
          rawRequest<NarrationAdminSummary[]>(
            `/admin/narrations${buildQuery({ storyId: query.storyId, limit: query.limit })}`,
            { signal: query.signal },
          ),
        attach: (storyId, input) =>
          rawRequest<NarrationAdminSummary>(`/admin/stories/${storyId}/narrations`, cfg('POST', input)),
        update: (id, input) =>
          rawRequest<NarrationAdminSummary>(`/admin/narrations/${id}`, cfg('PATCH', input)),
      },
      catalogue: {
        createTribe: (input) => rawRequest<TribeSummary>('/admin/tribes', cfg('POST', input)),
        updateTribe: (id, input) => rawRequest<TribeSummary>(`/admin/tribes/${id}`, cfg('PATCH', input)),
        createCategory: (input) => rawRequest<CategorySummary>('/admin/categories', cfg('POST', input)),
        updateCategory: (id, input) =>
          rawRequest<CategorySummary>(`/admin/categories/${id}`, cfg('PATCH', input)),
        createNarrator: (input) =>
          rawRequest<{ id: string; slug: string; name: string }>('/admin/narrators', cfg('POST', input)),
        updateNarrator: (id, input) =>
          rawRequest<{ id: string; slug: string; name: string }>(`/admin/narrators/${id}`, cfg('PATCH', input)),
      },
      storyOfTheDay: {
        list: (from, to) =>
          rawRequest<StoryOfDayEntry[]>(`/admin/story-of-the-day${buildQuery({ from, to })}`),
        set: (date, storyId) =>
          rawRequest<StoryOfDayEntry>(`/admin/story-of-the-day/${date}`, cfg('PUT', { storyId })),
        remove: (date) =>
          rawRequest<{ ok: true }>(`/admin/story-of-the-day/${date}`, cfg('DELETE')),
      },
      submissions: {
        queue: (query = {}) =>
          rawRequest<Paginated<SubmissionSummary>>(
            `/admin/submissions${buildQuery({
              status: query.status,
              limit: query.limit,
              cursor: query.cursor,
            })}`,
            { signal: query.signal },
          ),
        claim: (id) => rawRequest<SubmissionSummary>(`/admin/submissions/${id}/claim`, cfg('POST')),
        requestChanges: (id, input) =>
          rawRequest<SubmissionSummary>(`/admin/submissions/${id}/request-changes`, cfg('POST', input)),
        approve: (id, input = {}) =>
          rawRequest<SubmissionSummary>(`/admin/submissions/${id}/approve`, cfg('POST', input)),
        reject: (id, input) =>
          rawRequest<SubmissionSummary>(`/admin/submissions/${id}/reject`, cfg('POST', input)),
      },
      users: {
        list: (query = {}) =>
          rawRequest<Paginated<AdminUserRow>>(
            `/admin/users${buildQuery({ q: query.q, limit: query.limit })}`,
            { signal: query.signal },
          ),
        update: (id, input) => rawRequest<AdminUserRow>(`/admin/users/${id}`, cfg('PATCH', input)),
      },
      featureFlags: {
        list: () => rawRequest<FeatureFlagRow[]>('/admin/feature-flags'),
        set: (key, enabled) =>
          rawRequest<FeatureFlagRow>(`/admin/feature-flags/${encodeURIComponent(key)}`, cfg('PUT', { enabled })),
      },
      auditLog: {
        list: (query = {}) =>
          rawRequest<Paginated<AuditLogRow>>(`/admin/audit-log${buildQuery({ limit: query.limit })}`, {
            signal: query.signal,
          }),
      },
      metrics: {
        overview: () => rawRequest<AdminMetricsOverview>('/admin/metrics/overview'),
      },
    },

    submissions: {
      mine: (query = {}) =>
        rawRequest<Paginated<SubmissionSummary>>(
          `/submissions/mine${buildQuery({ limit: query.limit, cursor: query.cursor })}`,
          { signal: query.signal },
        ),
      get: (id, opts) =>
        rawRequest<SubmissionDetail>(`/submissions/${id}`, { signal: opts?.signal }),
      create: (input) => rawRequest<SubmissionDetail>('/submissions', cfg('POST', input)),
      update: (id, input) => rawRequest<SubmissionDetail>(`/submissions/${id}`, cfg('PATCH', input)),
      submit: (id) => rawRequest<SubmissionSummary>(`/submissions/${id}/submit`, cfg('POST')),
      withdraw: (id) => rawRequest<SubmissionSummary>(`/submissions/${id}/withdraw`, cfg('POST')),
    },
    getConfig: (opts) => rawRequest('/config', { signal: opts?.signal }),

    getHome: (query = {}) =>
      rawRequest(`/home${buildQuery({ tribe: query.tribe })}`, { signal: query.signal }),

    getTribe: (slug, opts) =>
      rawRequest(`/tribes/${encodeURIComponent(slug)}`, { signal: opts?.signal }),

    getTribes: (query = {}) =>
      rawRequest<TribeSummary[]>(
        `/tribes${buildQuery({ q: query.q, region: query.region as Region | undefined })}`,
        { signal: query.signal },
      ),

    getCategories: (opts) => rawRequest<CategorySummary[]>('/categories', { signal: opts?.signal }),

    getStories: (query = {}) =>
      rawRequest<Paginated<StoryCard>>(
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
      rawRequest<SearchSuggestion[]>(
        `/stories/search-suggestions${buildQuery({ q })}`,
        { signal: opts?.signal },
      ),

    getStory: (slug, opts) =>
      rawRequest<StoryDetail>(`/stories/${encodeURIComponent(slug)}`, { signal: opts?.signal }),

    getRecommendations: (slug, opts) =>
      rawRequest<StoryCard[]>(`/stories/${encodeURIComponent(slug)}/recommendations`, {
        signal: opts?.signal,
      }),

    getLibrary: (tab, query = {}) =>
      rawRequest<Paginated<StoryCard>>(
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
      rawRequest<Paginated<AuthorSummary>>(
        `/authors${buildQuery({ q: query.q, limit: query.limit, cursor: query.cursor })}`,
        { signal: query.signal },
      ),

    getAuthor: (slug, opts) =>
      rawRequest<AuthorDetail>(`/authors/${encodeURIComponent(slug)}`, { signal: opts?.signal }),

    getStoryOfTheDay: (opts) =>
      rawRequest<StoryCard>('/stories/story-of-the-day', { signal: opts?.signal }),
  };
}

export { buildQuery };

// ───────────── Phase 4: admin & submissions ─────────────

import type {
  AdminMetricsOverview,
  AdminStoryDetail,
  AdminStoryListQuery,
  AdminStorySummary,
  AdminUserRow,
  AttachNarrationInput,
  AuditLogRow,
  CategoryInput,
  FeatureFlagRow,
  ModerationActionInput,
  NarrationAdminSummary,
  NarratorInput,
  PublishResponse,
  StoryInput,
  StoryOfDayEntry,
  SubmissionDetail,
  SubmissionInput,
  SubmissionStatus,
  SubmissionSummary,
  TribeInput,
  UpdateNarrationInput,
} from '@ubuntu-tales/shared';

export interface AdminClient {
  stories: {
    list(query?: AdminStoryListQuery & RequestOptions): Promise<Paginated<AdminStorySummary>>;
    get(id: string, opts?: RequestOptions): Promise<AdminStoryDetail>;
    create(input: StoryInput): Promise<AdminStoryDetail>;
    update(id: string, input: Partial<StoryInput>): Promise<AdminStoryDetail>;
    publish(id: string): Promise<PublishResponse>;
    unpublish(id: string): Promise<PublishResponse>;
    archive(id: string): Promise<PublishResponse>;
  };
  narrations: {
    list(query?: { storyId?: string; limit?: number; signal?: AbortSignal }): Promise<NarrationAdminSummary[]>;
    attach(storyId: string, input: AttachNarrationInput): Promise<NarrationAdminSummary>;
    update(id: string, input: UpdateNarrationInput): Promise<NarrationAdminSummary>;
  };
  catalogue: {
    createTribe(input: TribeInput): Promise<TribeSummary>;
    updateTribe(id: string, input: Partial<TribeInput>): Promise<TribeSummary>;
    createCategory(input: CategoryInput): Promise<CategorySummary>;
    updateCategory(id: string, input: Partial<CategoryInput>): Promise<CategorySummary>;
    createNarrator(input: NarratorInput): Promise<{ id: string; slug: string; name: string }>;
    updateNarrator(id: string, input: Partial<NarratorInput>): Promise<{ id: string; slug: string; name: string }>;
  };
  storyOfTheDay: {
    list(from: string, to: string): Promise<StoryOfDayEntry[]>;
    set(date: string, storyId: string): Promise<StoryOfDayEntry>;
    remove(date: string): Promise<{ ok: true }>;
  };
  submissions: {
    queue(query?: { status?: SubmissionStatus; limit?: number; cursor?: string; signal?: AbortSignal }): Promise<Paginated<SubmissionSummary>>;
    claim(id: string): Promise<SubmissionSummary>;
    requestChanges(id: string, input: ModerationActionInput): Promise<SubmissionSummary>;
    approve(id: string, input?: ModerationActionInput): Promise<SubmissionSummary>;
    reject(id: string, input: ModerationActionInput): Promise<SubmissionSummary>;
  };
  users: {
    list(query?: { q?: string; limit?: number; signal?: AbortSignal }): Promise<Paginated<AdminUserRow>>;
    update(id: string, input: { systemRole?: AdminUserRow['systemRole']; status?: AdminUserRow['status'] }): Promise<AdminUserRow>;
  };
  featureFlags: {
    list(): Promise<FeatureFlagRow[]>;
    set(key: string, enabled: boolean): Promise<FeatureFlagRow>;
  };
  auditLog: {
    list(query?: { limit?: number; signal?: AbortSignal }): Promise<Paginated<AuditLogRow>>;
  };
  metrics: {
    overview(): Promise<AdminMetricsOverview>;
  };
}

export interface ContributorClient {
  mine(query?: { limit?: number; cursor?: string; signal?: AbortSignal }): Promise<Paginated<SubmissionSummary>>;
  get(id: string, opts?: RequestOptions): Promise<SubmissionDetail>;
  create(input: SubmissionInput): Promise<SubmissionDetail>;
  update(id: string, input: Partial<SubmissionInput>): Promise<SubmissionDetail>;
  submit(id: string): Promise<SubmissionSummary>;
  withdraw(id: string): Promise<SubmissionSummary>;
}
