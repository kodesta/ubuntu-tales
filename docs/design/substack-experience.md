# Ubuntu Tales — Editorial Experience (Substack-inspired)

Status: **binding for Phase 1** · Owner: product/design · Last updated: 2026-11-14

## 1. Why this document exists

The original production plan said "port the concept app 1:1". That concept app (Angular, assets,
component CSS) is **not present in this repository** — only the plan docs are. The user has also
asked for the product to have **"a Substack feel"**. This document is therefore the visual and
experiential source of truth for the rebuild until a visual baseline exists.

It does not throw away the plan's palette or tone: it keeps the concept's warm terracotta/saffron
African identity and Lora + DM Sans typography, and rebuilds the information architecture around a
publication/reading metaphor instead of an app-dashboard metaphor.

**Substack-inspired, not a Substack clone.** We borrow the reading posture — publications, editorial
typography, generous whitespace, flat hairline surfaces, a calm reading feed, a reader-first post
page — and express it through African literary identity.

## 2. Product metaphor

| Product concept | UbuntU Tales equivalent |
| --- | --- |
| Publication | A **tribe** (Zulu, Yoruba, Maasai …). Each tribe is a publication with a masthead, tagline, description, accent colour, subscriber count and archive. |
| Post / letter | A **tale**. It has a publication line, title, dek, byline (narrator), date, read time, body and an end-of-post subscribe CTA. |
| Author | A **narrator / griot** — the voice of the tale, with a portrait, role label and bio. |
| Subscriber | A **reader who follows a publication**. Phase 1 stores follows locally; real accounts arrive in Phase 2. |
| Inbox / reading list | The **home feed** — "Your reading list": today's tale, new tales from publications you follow, wisdom notes, publications to discover. |
| Archive | The **library** — a calm, filterable list of all tales. |

Terminology in UI: "publication" may appear in editorial copy, but we keep the heritage words
**tribe**, **tale**, **griot**. Never call the audience "users" in UI copy.

## 3. Design principles

1. **Read first, chrome second.** Every screen should make the tale the loudest thing on it.
2. **Editorial, not app-like.** Serif headlines, hairline rules, flat surfaces, restrained colour.
3. **Warm paper, not white.** The page feels like a well-kept book, not a dashboard.
4. **One accent per publication.** Tribe accent colours tint mastheads, badges and links only.
5. **Quiet mobile.** Thumb-first, 44 px targets, no hover-only affordances, no heavy shadows.
6. **Generous rhythm.** Whitespace is the design. Do not compress line height or padding to fit more.
7. **Hand-made imagery.** Geometric/patterned SVG cover art. No stock photography, no gradients
   used as decoration, no generic "SaaS" blobs.
8. **Motion is a courtesy.** 150–220 ms transitions, respect `prefers-reduced-motion`.

### Explicit anti-patterns (do not ship)

- Purple/blue SaaS gradients, glassmorphism, glowing cards, drop-shadowed rounded cards.
- Centered hero + three feature cards + testimonial layout.
- Emoji everywhere. (Reactions use emoji deliberately and only there.)
- Truncating story text with `line-clamp` unless it is a card dek (max 2–3 lines).
- A dashboard-style stats grid as the home page.
- Fonts other than Lora / DM Sans.

## 4. Design tokens (`apps/web/src/styles/tokens.css`)

```css
:root {
  /* paper & ink */
  --paper: #fbf7f0;
  --paper-raised: #fffdf9;
  --paper-sunk: #f4ecdf;
  --ink: #1e1a17;
  --ink-soft: #453d36;
  --muted: #6b6056;
  --faint: #6f6459;
  --line: #e5dbcc;
  --line-strong: #d3c5b2;

  /* brand */
  --terracotta: #b4472c;
  --terracotta-dark: #8d3520;
  --terracotta-wash: #f6e4dc;
  --saffron: #df9a2b;
  --saffron-wash: #fbf0da;
  --forest: #2f5d4e;
  --forest-wash: #e3ece7;
  --clay: #8c5a3c;

  /* semantic */
  --success: #2f6b4f;
  --danger: #a02e2e;
  --focus: #b4472c;

  /* type */
  --font-serif: 'Lora Variable', 'Iowan Old Style', Georgia, 'Times New Roman', serif;
  --font-sans: 'DM Sans Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --text-display: clamp(2.6rem, 6vw, 4.6rem);
  --text-h1: clamp(2rem, 4.4vw, 3.2rem);
  --text-h2: clamp(1.5rem, 2.6vw, 2rem);
  --text-h3: 1.25rem;
  --text-post-title: clamp(2.1rem, 4.6vw, 3.35rem);
  --text-dek: clamp(1.1rem, 1.8vw, 1.3rem);
  --text-body: 1.1875rem;      /* 19px — story body */
  --text-ui: 0.9375rem;
  --text-meta: 0.8125rem;
  --text-micro: 0.75rem;

  /* rhythm */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 96px;

  --radius-xs: 2px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-pill: 999px;

  --shadow-none: none;
  --shadow-pop: 0 16px 40px -20px rgb(30 26 23 / 35%);
  --ring: 0 0 0 2px var(--paper), 0 0 0 4px var(--focus);

  --content-width: 1120px;
  --reader-width: 680px;
  --header-height: 64px;
}
```

Rules: no raw hex values in component CSS — always tokens (tribe accents are passed as CSS custom
properties from data). Spacing only from the scale. Type sizes only from the scale.

## 5. Typography

- **Lora Variable** — display, headlines, story body, deks, pull quotes, wordmark.
- **DM Sans Variable** — labels, meta, buttons, navigation, captions, forms, all UI.
- Story body: `1.1875rem/1.75`, max `68ch`, paragraph gap `1.4em`, no first-line indent.
- Headlines: Lora 500, tight leading (1.05–1.15), `letter-spacing: -0.01em`.
- Meta/eyebrows: DM Sans 500, `0.75rem`, uppercase, `letter-spacing: 0.09em`, `--muted`.
- Links inside body: underline 1px, terracotta, underline offset 0.18em.
- Long titles must wrap; never `text-overflow: ellipsis` on story titles in the reader.

## 6. Layout system

- Global max width `1120px`, page gutters `clamp(16px, 4vw, 40px)`.
- Reading column `680px`, centered.
- Breakpoints: `640px` (mobile → tablet), `900px`, `1200px`.
- Header: sticky, 64px, `--paper` at 92 % with `backdrop-filter: blur(8px)`, bottom hairline.
- Footer: full-width `--paper-sunk`, hairline top, 4 columns on desktop → stacked on mobile.
- Mobile bottom nav (`BottomNav`): 5 items — Read, Explore, Publications, Library, Saved. Hidden on
  the reader route (`/stories/$slug`) so the tale owns the screen; a slim floating back bar is used
  there.

### Page shells

1. **Feed shell** — max 1120px: asymmetric 8/4 grid on desktop (feed left, sidebar right);
   single column on mobile. Sidebar holds "Publications you follow", "Wisdom notes", newsletter-style
   "About Ubuntu Tales" card. Home uses this.
2. **Reader shell** — 680px centered with a reading-progress hairline fixed at the very top.
3. **Publication shell** — accent-tinted masthead band, then the archive list.

## 7. Screen specifications

### 7.1 `/welcome` — first visit

- Full viewport warm paper; small wordmark top-left.
- Left 55 %: eyebrow "ORAL TRADITION, KEPT ALIVE"; display line **“Stories your grandmother knew.”**;
  dek: “Read and listen to folktales from across Africa — one tribe, one telling at a time.”
- Primary button "Choose your roots" → `/tribes?onboarding=1`; text link "Just start reading" → `/`.
- Right 45 %: a composition of two overlapping cover artworks with a paper mat and a rotated small
  editorial card (“Tale of the day …”). No carousel, no auto-play.
- First visit is detected with `localStorage['ut.onboarded']`; later visits redirect to `/`.

### 7.2 `/tribes` — publications index

- Editorial masthead: eyebrow "THE PUBLICATIONS", h1 "Choose the voices you want to hear.",
  intro paragraph (max 60ch), search field, region filter pills (All + 5 regions).
- Grid: 2 columns ≥ 900px, 1 column below. Each publication card is horizontal: square cover strip
  (or accent monogram), name (Lora 1.5rem), tagline, `N tales · M readers`, follow pill.
- Selecting a publication while onboarding: mark chosen (check), store slug locally, show
  "Begin reading" sticky action. Low-story dialog if `publishedStoryCount < 5` with both actions
  ("Choose anyway", "Explore others").
- `?onboarding=1` adds step chrome (“Step 1 of 1 · Your roots”) and the continue action.

### 7.3 `/tribes/$slug` — publication page

- Masthead band tinted with the tribe accent (8 % wash), left: large monogram/cover, name
  (Lora, `--text-h1`), tagline, description, stats row; right: "Subscribe" primary button
  (local state, toggles "Subscribed ✓") + share icon button.
- "Latest tales" — editorial numbered list (01, 02, 03…) with title, dek, meta, read time.
- "From the archive" — 3-up cover cards.
- "About this publication" — short editorial note, plus a hairline box: “This is a community
  publication. Tales are traditional and retold with care.”

### 7.4 `/` — home ("Your reading list")

- Header greeting: eyebrow with date (`Friday, 14 November`), display-ish h1 "Your reading list."
  Optional personal line: “Welcome back, {tribe} reader.” (guest name absent).
- **Today's tale** hero: 7/5 split. Left: publication eyebrow (accent bar + tribe name), Lora title
  `--text-post-title`, dek, byline "Narrated by X · 6 min read", "Read the tale →" button. Right:
  cover with a thin paper mat and small caption. On mobile: cover above text at the artwork's native 3:2 ratio.
- **From your publications** feed: section header with "View all →". Rows: 112×84 cover thumb,
  meta line (publication · date), title (Lora 1.35rem), dek clamp 2, footer meta (category badge,
  read time, save icon). Hairline between rows. Every row links to `/stories/$slug`.
- **Wisdom notes** (sidebar + inline on mobile): 5 quote cards, Lora italic 1.15rem, source line;
  horizontal scroll on mobile, stacked in sidebar on desktop.
- **Discover publications**: horizontal scroll rail of publication cards with monogram, name,
  tagline, `N tales`, follow pill.
- If no tribe chosen: a quiet inline band "Choose your roots to personalise this feed" → `/tribes`.
- If signed-out actions are triggered (save/follow), show a small toast “Saved on this device —
  accounts are coming soon.” Do not build an auth modal in Phase 1.

### 7.5 `/stories/$slug` — the reader (most important screen)

- Fixed 2px reading progress bar at top in tribe accent.
- Top bar (not global header): back arrow, publication name (small caps), actions: font size
  `A− / A+`, bookmark, share. Sticky, transparent → paper with hairline after scroll.
- Article header, centered 680px:
  - publication line (accent dot + tribe name · category) as a link;
  - h1 title (Lora, `--text-post-title`, tight);
  - dek (`--text-dek`, Lora, `--ink-soft`, max 44ch);
  - byline row: 40px narrator avatar (monogram if none), name + role label; date · read time.
- Cover image full 680px wide, 3:2, radius 2px, caption (caption from cover alt).
- Body: Lora 19px/1.75; each sentence is `<span data-sentence-id>` inside `<p>` (read-along-ready).
  Reading position tracked by scroll; store `{slug, percent, lastSentenceId}` locally.
- End matter: ornament (thin rule + "◆"), moral in a Lora italic pull quote with “The wisdom” label;
  reaction row (5 emotions, local state); action row Save / Share / Copy link; subscribe CTA card
  tinted with tribe wash: “Follow {Tribe} — new tales, straight from the fire.”; "More from
  {Tribe}" 3 cards; "Next tale" full-width teaser.
- Font size persists in `localStorage['ut.fontSize']`; remove any `user-select: none`.

### 7.6 `/library` — archive

- Masthead: eyebrow "THE ARCHIVE", h1 "The library.", intro.
- Tabs as URL state: **All tales** (`?tab=stories`), **Audio** (`?tab=audio`), **Voices**
  (`?tab=authors`). Substack archive feel: filter pills (category), list rows separated by hairlines,
  each row: cover 96×72, title (Lora), publication + date, category badge, read time, save.
- Infinite scroll sentinel; skeleton rows while loading; empty state per tab.
- Audio tab shows "Narrations are being recorded" if empty; Voices tab lists narrators with avatar,
  role, story count, link to `/authors/$slug`.

### 7.7 `/authors/$slug` — griot profile

- Masthead: avatar monogram 96px, name, role label, bio, stats (`N tales`, `M tribes`).
- "Tales told by …" — the archive list style.
- Sidebar: publication affiliations (tribe links), "Follow this voice" (local).

### 7.8 `/saved` — reading list

- Header "Your reading list." + count; filter pills All / In progress / Offline (offline disabled
  with a "coming with downloads" note).
- Rows same grammar as library, with progress hairline under the meta and "Continue reading".
- Empty state: illustration-less, Lora line "Nothing saved yet." + button "Browse the library".

### 7.9 `/stories/$slug/complete` — end of tale

- Tinted paper, centered. "Ubuntu!" as eyebrow, Lora "You have finished this tale."
- Reaction picker (large emoji buttons + label + meaning, selection persists locally).
- Author note / wisdom quote, 3 recommendations from the API, "Back to reading list" + "Share wisdom".
- Confetti: CSS-only, ≤ 1.2s, disabled with reduced motion.

### 7.10 `/explore` — the atlas

- Masthead: eyebrow "THE ATLAS", h1 "The world that tells these tales.", intro about the map being a
  doorway rather than a diagram.
- Controls: region filter pills (All + five regions), an **Africa / World** segmented map view, and a
  **List view** toggle (the same data without the map, for keyboard/screen-reader readers).
- Map: 2:1 world map (Natural Earth 110m, equirectangular) on paper-sunk; world land in paper with
  hairline strokes, the African continent in saffron-wash with a saffron outline. Each publication is
  a pin at its curated cultural homeland, coloured with the publication accent, sized by tale count
  (6–14 px), with a soft halo and one selected pin outlined in ink.
- Right panel (below the map on mobile): the selected publication — region/place eyebrow, name linked
  to the publication page, tagline, 2–3 sentence description, "Tales from here" rows (cover thumb,
  title, category · read time · audio) linking into the reader, and "Read the whole publication →".
- Sidebar: "Places" list (same selection model, coloured dots) and "By region" summary with
  publication/tale counts; a quiet note that pins are cultural homelands, not borders.
- Voice: "Each pin is a publication. Follow one to the ground it grows from, then open a tale — the
  map is only the beginning of the journey."
- Accessibility: pins are focusable buttons with a full accessible name (name, tale count, place);
  Enter/Space selects; the list view removes the SVG entirely; no colour-only meaning.

### 7.11 404

- Editorial: "This path has grown over." + "The tale may have moved." + link home/library.

## 8. Components (`apps/web/src/ui`)

`Button` (primary/secondary/ghost/quiet/pill), `IconButton`, `Badge` (category and neutral),
`Meta` (uppercase label row), `Rule`, `Masthead`, `PublicationMark` (monogram/cover), `StoryCard`
(hero/list/row/mini), `PublicationCard`, `TaleRow`, `ArchiveList`, `SectionHeader`, `SearchField`,
`Tabs` (Radix), `Dialog`/`BottomSheet` (Radix Dialog), `Drawer`, `Toast`, `Avatar`, `ProgressBar`,
`Skeleton`, `EmptyState`, `SaveButton`, `FollowButton`, `ReactionRow`, `Footer`, `BottomNav`,
`Header`, `PageShell`, `ReadingProgress`, `Ornament`.

Every component: CSS Module, tokens only, keyboard accessible, `focus-visible` ring.

## 9. Data & local state (Phase 1)

- Catalogue via API: `/home`, `/tribes`, `/tribes/:slug`, `/categories`, `/stories`,
  `/stories/search-suggestions`, `/stories/:slug`, `/authors/:slug`, `/library/*`.
- Local-only (no accounts): `ut.tribe`, `ut.follows`, `ut.saved`, `ut.progress`, `ut.fontSize`,
  `ut.onboarded`, `ut.reactions` in `localStorage` through small Zustand stores. Writes are
  optimistic; a toast confirms. These stores are designed to be replaced by the Phase 2 API.
- Never animate layout on first paint; skeletons match final row heights.

## 10. Accessibility & performance

- WCAG 2.2 AA: body text ≥ 4.5:1 on paper; accent colours only for large text/graphics or with
  dark ink; visible focus rings; one h1 per page; landmarks (`header/nav/main/footer`).
- Touch targets ≥ 44×44; bottom nav labels always visible.
- Reader: `aria-current` on the active sentence when read-along lands; text selectable.
- No layout shift: images have width/height and paper-coloured placeholder; cover aspect ratios fixed.
- Initial JS budget ≤ 170 KB gzip; no charting/animation libraries; confetti is CSS.

## 11. Content voice

- Warm, precise, literary; short sentences; African names and places spelled correctly.
- Eyebrows uppercase; no exclamation marks except the celebration screen; no “Hey there!”.
- Publication taglines are one editorial line, e.g.
  - Zulu — “Voices from the eastern grasslands.”
  - Yoruba — “Tales of wit, gods and the market square.”
  - Maasai — “Under the acacia, where the herds walk.”
  - Igbo — “The forest keeps its own memory.”
- Morals are proverb-shaped, e.g. “A tree is known by its fruit, a person by their deeds.”
