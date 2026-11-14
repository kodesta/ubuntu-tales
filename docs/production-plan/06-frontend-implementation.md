# 06 — Frontend Implementation (React)

## 1. Stack recap

React 19 + Vite 6 + TypeScript strict, TanStack Router (file-based), TanStack Query, Zustand, React Hook Form + Zod, Radix UI primitives, CSS Modules + global tokens, `vite-plugin-pwa`, `react-i18next`, `@fontsource-variable/lora` and `@fontsource-variable/dm-sans` (self-hosted fonts — replaces the Google Fonts link for privacy and performance).

## 2. Project structure (`apps/web/src`)

```
src/
├── main.tsx
├── app/
│   ├── providers.tsx          # QueryClient, Router, i18n, ErrorBoundary, Toaster
│   ├── query-client.ts
│   └── router.tsx
├── routes/                    # TanStack Router file routes (see §3)
├── features/
│   ├── auth/                  # session store, login/signup forms, AuthModal, route guards
│   ├── onboarding/
│   ├── tribes/                # TribeGrid, TribeCard, LowStoryDialog
│   ├── home/                  # StoryOfTheDayHero, YourTribeRail, CategoryPills, SearchOverlay
│   ├── stories/               # StoryCard, StoryList, story queries/hooks
│   ├── reader/                # ReadMode, SentenceText, FontSizeControl, useReadAlong
│   ├── player/                # AudioEngine, playerStore, MiniPlayer, FullPlayer, Soundscape
│   ├── celebration/           # ReactionPicker, Recommendations, ShareWisdomDialog
│   ├── library/               # LibraryTabs, LibraryGrid (infinite), SubmitStoryCta
│   ├── saved/                 # SavedList, SavedFilters, SavedStoryCard
│   ├── profile/               # ProfileSheet, StatsCards, Settings
│   ├── submissions/           # SubmissionForm, MySubmissions, UploadField
│   ├── offline/               # download manager, IndexedDB repo, sync queue
│   └── admin/                 # lazy-loaded console (see §9)
├── ui/                        # design-system components (see §7)
├── lib/
│   ├── api.ts                 # re-exports from @ubuntu-tales/api-client, configures http
│   ├── device-id.ts
│   ├── analytics.ts           # PostHog wrapper, consent-gated
│   ├── i18n.ts
│   └── format.ts              # durations, dates
├── locales/en/*.json
└── styles/
    ├── tokens.css             # ported 1:1 from concept src/styles.css :root
    ├── base.css               # reset, typography classes
    └── fonts.css
```

## 3. Routes (concept screen → URL)

The concept switches screens with a `currentScreen` signal. Every screen becomes a real URL so it can be deep-linked, shared, and restored.

| Concept screen | Route | Auth | Notes |
| --- | --- | --- | --- |
| `onboarding` | `/welcome` | public | Shown on first visit (flag `ut.onboarded` in localStorage) — "Join tribe" → `/tribes?onboarding=1`, "Skip" → `/` |
| `tribe-selection` | `/tribes` | public | Selecting a tribe: signed-in → `PATCH /me {tribeId}`; guest → stored locally and applied after signup. Low-story dialog when `publishedStoryCount < lowStoryThreshold` |
| — (new) | `/tribes/$slug` | public | Tribe page with its stories |
| `home` | `/` | public, personalised if signed in | Search state in URL: `/?q=baobab&category=wisdom` |
| `read-mode` | `/stories/$slug` | public | Read-along with mini player |
| `player` | `/stories/$slug/listen` | public | Full player |
| `celebration` | `/stories/$slug/complete` | public; reactions require auth | Shown after finishing |
| `library` | `/library?tab=stories\|audio\|authors` | public | Infinite scroll grid |
| — (new) | `/authors/$id` | public | Author profile |
| `saved` | `/saved?filter=all\|in-progress\|offline` | auth | Offline filter works with no network |
| Profile modal | `/profile` (rendered as bottom sheet over the previous route on mobile) | auth | Stats, links, logout |
| Auth modal | `/login`, `/signup` + `AuthModal` opened by `requireAuth()` for gated actions | public | Gated actions resume after login (save, react, submit) |
| Submit Story modal | `/submit`, `/me/submissions`, `/me/submissions/$id` | verified email | Full form replaces the concept's title-only modal |
| — (new) | `/forgot-password`, `/reset-password`, `/verify-email` | public | Token from email link query string |
| — (new) | `/settings` | auth | Account, data saver, language, privacy/consents, export data, delete account |
| — (new) | `/legal/terms`, `/legal/privacy`, `/about` | public | Static markdown |
| — (new) | `/admin/*` | EDITOR+ | Lazy-loaded console |
| — | `*` | public | Branded 404 |

The app shell (`routes/__root.tsx`) renders: top header (brand, menu, profile), `<Outlet/>`, `MiniPlayer` (when a track is loaded and the current route is not `/listen`), `BottomNav` (Home, Library, Tribes, Saved; hidden on read/listen/complete routes), `NavDrawer`, `Toaster`. Use the concept's `app.html` drawer and profile markup as the visual spec.

## 4. State management

| State | Where |
| --- | --- |
| Server data (stories, tribes, me, saved, progress) | TanStack Query via generated hooks. `staleTime` 60 s for catalogue, 0 for `me/*` |
| Access token, current user snapshot | `sessionStore` (Zustand, memory only). On boot call `POST /auth/refresh`; if it succeeds, load `/me` |
| Player (track, position, rate, playing, soundscape on/off/gain) | `playerStore` (Zustand) synced from `AudioEngine` events |
| UI chrome (drawer open, auth modal, toasts) | `uiStore` (Zustand) |
| Preferences (font size, data saver, playback rate, soundscape default) | `prefsStore` (Zustand `persist` → localStorage; non-sensitive) |
| Offline content and queued writes | IndexedDB via `idb` (see §6) |
| Guest tribe choice, guest saved list, guest progress | localStorage; merged into the account after signup/login by calling the normal endpoints, then cleared |

Optimistic updates for save/unsave and reactions (rollback on error with a toast).

## 5. Audio player and read-along

### 5.1 AudioEngine (singleton, outside React)
- Owns one `HTMLAudioElement` for narration (`preload="metadata"`, `crossOrigin="anonymous"`) and one for the soundscape loop.
- Soundscape volume uses Web Audio (`AudioContext` → `MediaElementAudioSourceNode` → `GainNode`) because iOS Safari ignores `audio.volume`. This requires CORS headers on `media.ubuntutales.com` (`Access-Control-Allow-Origin: https://ubuntutales.com`).
- API: `load(narration, { startMs })`, `play()`, `pause()`, `seek(ms)`, `skip(±15000)`, `setRate(0.75|1|1.5|2)`, `setSoundscape(on, gain)`, `unload()`; emits `timeupdate`, `ended`, `error`, `stalled`.
- Chooses rendition: `aac_64k` when data saver is on or `navigator.connection.saveData`/`effectiveType` is `2g`/`3g`; otherwise `aac_128k`. Offline → object URL from Cache Storage.
- Media Session API: title, tribe, narrator, artwork, and handlers for play/pause/seek/skip so lock-screen controls work.
- Persists progress via `useProgressSync`: every 15 s while playing, on pause, on `visibilitychange: hidden` (using `fetch(..., { keepalive: true })`), and on `ended` → `/complete`.

### 5.2 Read-along (`useReadAlong`)
- Input: `body.paragraphs`, `sentenceTimings`, `currentTimeMs`.
- Active sentence by binary search over `startMs` (O(log n) per `timeupdate`; throttle to animation frames).
- Auto-scroll the active sentence into the reading viewport (`scrollIntoView({ block: 'center', behavior: 'smooth' })`), paused for 5 s after the user scrolls manually.
- Tapping a sentence seeks to its `startMs` (or, with no timings, just marks it as the reading position).
- Without audio, progress = furthest sentence scrolled into view / total sentences.
- Font sizes sm/md/lg map to CSS variables; preference persisted.
- Accessibility: sentences are `<span>`s inside real `<p>`s; the active one has `aria-current="true"`; highlight colour meets 4.5:1 contrast. **Remove the concept's global `user-select: none`** for story text so users can select and copy.

## 6. Offline and PWA

- `vite-plugin-pwa` with `injectManifest` strategy (custom service worker in `src/sw.ts`).
- Precache: app shell, route chunks, fonts, icons.
- Runtime caching:
  - Images on `media.ubuntutales.com/img/*`: CacheFirst, 300 entries, 30 days.
  - API catalogue GETs: StaleWhileRevalidate, 50 entries, 1 day.
  - Audio is **not** runtime-cached (too large); only explicitly downloaded.
- Downloads (`features/offline`):
  - `downloadStory(slug)`: fetch `/stories/:slug/offline-bundle` → save JSON to IndexedDB store `stories`; fetch audio rendition + cover with progress (`ReadableStream`), store in Cache Storage `offline-media-v1`; then `POST /me/downloads/:storyId`.
  - Storage quota: call `navigator.storage.persist()` on first download; show used space in Settings; allow "remove all downloads".
  - Range requests for cached audio: the service worker serves `206` responses from cached full files (Workbox `RangeRequestsPlugin`).
- Offline writes: progress, reactions, save/unsave queued in IndexedDB `outbox` and replayed on `online` / Background Sync. Server resolves conflicts with `clientUpdatedAt` (last write wins).
- Offline UI: banner "You're offline — showing downloaded stories"; non-downloaded stories appear disabled in Saved.
- Manifest: name "Ubuntu Tales", theme colour `#E8820B`, background `#FFFFFF`, maskable icons, `display: standalone`, `orientation: portrait`.
- Update flow: when a new SW is waiting, show a toast "New version available — Refresh".

## 7. Design system (`src/ui`)

Port, do not redesign. The concept CSS (`src/styles.css` + ~4,100 lines of component CSS) is the visual spec.

1. Copy `:root` tokens verbatim into `styles/tokens.css`; add any colours/radii/shadows that are hardcoded in component CSS as new tokens.
2. Typography classes (`.text-display`, `.text-heading-1`…) go to `styles/base.css`; Lora for headings/story text, DM Sans for UI.
3. Each concept component's CSS becomes a CSS Module next to the React component, with hardcoded colours replaced by tokens.
4. Build these primitives first (Storybook-free; use a `/__ui` dev-only route as a gallery):
   `Button` (primary/secondary/ghost/pill), `IconButton`, `Badge`, `CategoryPill`, `SearchBar`, `Card`, `StoryCard` (list + grid + hero variants), `TribeCard` (with blob variant), `Tabs` (Radix), `Dialog` and `BottomSheet` (Radix Dialog), `Drawer`, `Toast`, `Slider` (Radix, for seek), `Avatar`, `Skeleton`, `EmptyState`, `OfflineBadge`, `ProgressBar`, `Icon` (inline SVG set extracted from the concept templates).
5. Images: `<Image>` component taking `ImageRef` → `srcset`/`sizes`, `loading="lazy"`, `decoding="async"`, blurhash placeholder (`react-blurhash` or CSS gradient fallback), explicit width/height to avoid layout shift.
6. Motion: respect `prefers-reduced-motion` (celebration confetti, transitions).
7. Visual regression: Playwright screenshots of key screens compared against the concept app at 390×844 (see `09`).

## 8. Data fetching patterns

- Route loaders call `queryClient.ensureQueryData` for critical data (story detail, home) so navigation renders without spinners; components use the same query hooks.
- Infinite lists (`library`, `stories`, `saved`) use `useInfiniteQuery` + `IntersectionObserver` sentinel (replacing the concept's fake `loadMore`).
- Search: debounce 250 ms, cancel in-flight requests, sync with URL search params; suggestions from `/stories/search-suggestions`.
- Prefetch story detail when a card enters the viewport on fast connections.
- Errors: route-level error boundaries with retry; `ApiError.code` mapped to friendly i18n messages.

## 9. Admin console (`features/admin`, routes `/admin/*`)

Lazy-loaded, desktop-first, plain but usable. Uses TanStack Table.

| Screen | Purpose |
| --- | --- |
| Dashboard | Counts, last 7/30 days completions and listening hours, moderation queue size |
| Stories list / editor | Filters by status/tribe/category; editor with title, summary, moral, tribe, category, region label, attribution, cover upload, paragraph editor (one textarea per paragraph, add/remove/reorder), preview as reader, publish/unpublish |
| Narrations | Upload audio (presigned upload with progress), choose narrator + soundscape, processing status, set default/publish |
| Timing editor | `wavesurfer.js` waveform + sentence list. "Tap mode": play audio and press Space at the start of each sentence; drag region edges to fine-tune; "Auto-align" button (phase 4); save → `PATCH /admin/narrations/:id` |
| Story of the Day calendar | Month view, assign stories per date |
| Submissions queue | List by status, claim, side-by-side view, request changes / approve / reject with note |
| Tribes, Categories, Narrators, Soundscapes | CRUD with image/audio upload |
| Users (ADMIN) | Search, change system role, suspend |
| Feature flags, Audit log (ADMIN) | |

## 10. Internationalisation and accessibility

- All UI strings in `locales/en/*.json` from day one (namespaces per feature). Plural/number/date formatting via `Intl`.
- `lang` attribute on story content follows `story.locale`.
- WCAG 2.2 AA: focus-visible styles, Radix for dialog focus traps, 44×44 px touch targets, player controls labelled, live region announcing the active sentence is **off** by default (too noisy) but available in settings.
- Keyboard shortcuts on desktop player: Space play/pause, ←/→ ±15 s, `+`/`-` speed.

## 11. Analytics events (consent-gated)

`app_opened`, `onboarding_completed`, `tribe_selected`, `story_opened`, `story_listen_started`, `story_completed`, `reaction_set`, `story_saved`, `story_downloaded`, `share_clicked`, `submission_submitted`, `signup_completed`. No PII in event properties.

## 12. Performance budget

- Initial JS ≤ 170 KB gzip (admin, wavesurfer, and celebration confetti are separate chunks).
- LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.05 on a mid-range Android over Slow 4G (Lighthouse CI enforces).
- Hero and cover images ≤ 60 KB at 640w.
