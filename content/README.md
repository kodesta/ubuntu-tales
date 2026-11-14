# `/content` — editorial catalogue

Plain, reviewable JSON that the database seed (`packages/db/prisma/seed.ts`) loads. Writers and
translators can work here without touching code. Every file is validated against the Zod schemas in
`packages/shared/src/content.ts`; the seed fails loudly on a bad file.

## Files

```
content/
├── categories.json      # 5 categories, ordered
├── tribes.json          # 16 publications (tribes), ordered
├── narrators.json       # griots/voices
└── stories/             # one <slug>.json per tale
    ├── the-baobab-that-kept-its-promise.json
    └── ...
```

## Story file shape

```jsonc
{
  "slug": "the-baobab-that-kept-its-promise",
  "title": "The Baobab That Kept Its Promise",
  "summary": "One-sentence dek, 90–180 characters, shown under the title.",
  "moral": "A tree is known by its fruit, a person by their deeds.",
  "tribeSlug": "zulu",
  "categorySlug": "wisdom",
  "narratorSlug": "thandiwe-nkosi",
  "regionLabel": "SOUTHERN AFRICA",
  "attribution": "A traditional Zulu tale, retold for Ubuntu Tales.",
  "cover": {
    "url": "/covers/the-baobab-that-kept-its-promise.svg",
    "alt": "Layered geometric baobab silhouettes at dusk",
    "accent": "#B4552D",
    "width": 1200,
    "height": 800,
  },
  "publishedAt": "2026-11-14T06:00:00.000Z",
  "isFeatured": true,
  "popularityScore": 0.92,
  "body": {
    "version": 1,
    "paragraphs": [
      {
        "id": "p_01",
        "sentences": [{ "id": "s_0001", "text": "Long ago, when the rivers were young, ..." }],
      },
    ],
  },
}
```

### Story body rules

- `paragraphs` in reading order, ids `p_01`, `p_02`, … (2 digits).
- Sentence ids are **stable and unique across the whole story**: `s_0001`, `s_0002`, … (4 digits,
  running across paragraphs). Sentence text includes its closing punctuation and no leading/trailing
  spaces.
- 4–12 paragraphs per tale. Flagship tales (`isFeatured: true`, 2–3 of them) should have 10–14
  paragraphs and 600–1,000 words. All others 4–7 paragraphs, 250–500 words.
- Do not put speaker labels (`“...” said X`) inside a sentence id if avoidable; one spoken sentence
  per sentence id is fine.
- Escape quotes as proper Unicode curly quotes (`“ ” ‘ ’`), no markdown inside text.

## `tribes.json`

```jsonc
{
  "slug": "zulu",
  "name": "Zulu",
  "region": "SOUTHERN_AFRICA",
  "countries": ["ZA"],
  "countriesLabel": "South Africa",
  "tagline": "Voices from the eastern grasslands.",
  "description": "2–3 sentences: where these tales come from, what they carry.",
  "accentColor": "#B4472C",
  "themeVariant": "grassland",
  "sortOrder": 1,
  "subscriberCount": 12400,
  "image": {
    "url": "/covers/publication-zulu.svg",
    "alt": "Publication mark for the Zulu tales",
    "accent": "#B4472C",
  },
}
```

Regions: `NORTH_AFRICA`, `WEST_AFRICA`, `CENTRAL_AFRICA`, `EAST_AFRICA`, `SOUTHERN_AFRICA`.

## `categories.json`

Exactly these five, with `sortOrder` 1–5:

| slug        | name            | badge            |
| ----------- | --------------- | ---------------- |
| `animal`    | Animal tales    | `ANIMAL TALE`    |
| `trickster` | Trickster tales | `TRICKSTER TALE` |
| `wisdom`    | Wisdom tales    | `WISDOM TALE`    |
| `folklore`  | Folklore        | `FOLKLORE`       |
| `creation`  | Creation myths  | `CREATION MYTH`  |

## `narrators.json`

```jsonc
{
  "slug": "thandiwe-nkosi",
  "name": "Thandiwe Nkosi",
  "roleLabel": "Griot · KwaZulu-Natal",
  "bio": "One or two sentences in the voice of the publication.",
  "accentColor": "#B4472C",
}
```

## Artwork

Cover SVGs live in `apps/web/public/covers/`. They are hand-authored, 1200×800, no external images,
no raster data, no fonts embedded (convert text to paths or avoid text). Palette should match the
tale's accent and the tokens in `docs/design/substack-experience.md`: warm paper, terracotta,
saffron, forest, clay, ink. Use layered flat geometric shapes — silhouettes, suns, baobabs, drums,
birds, patterns, cloth strips — with generous margins so cropping to 3:2 and 1:1 still looks good.

Publication marks are 600×600 SVGs: a strong monogram letter in Lora-like geometry inside a circle
or shield, on the publication accent, with a subtle pattern.

## Quality bar

- All titles, summaries and bodies are original retellings (traditional motifs, new prose).
- No placeholder text, no lorem ipsum, no “TODO”.
- Read time is computed by the seed (`ceil(words / 200)`); do not send it.
- Names, places and cultural references must be respectful and coherent. Prefer widely documented
  motifs from each people's oral tradition; when unsure, keep the tale generic within that region.
- Each tale should clearly belong to its category and tribe.

## Authoring scripts

The catalogue is committed as plain JSON. Two small, committed scripts keep the generated parts
reproducible (they only read/write files inside `content/` and `apps/web/public/covers/`):

| Script                                 | Purpose                                                                                                                                                                | Run                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `content/scripts/build-stories.mjs`    | Turns the plain-paragraph story source (dialogue included) into `stories/*.json` with deterministic `p_01`… / `s_0001`… IDs and prints per-tale word/paragraph counts. | `node content/scripts/build-stories.mjs`                        |
| `content/scripts/generate-artwork.mjs` | Draws the 18 story covers and 16 publication marks as flat-geometry SVGs in the design palette.                                                                        | `node content/scripts/generate-artwork.mjs`                     |
| `content/scripts/validate.ts`          | Validates every JSON file against the Zod schemas in `@ubuntu-tales/shared`, enforces the editorial rules above and checks every referenced SVG on disk.               | `packages/db/node_modules/.bin/tsx content/scripts/validate.ts` |

Run the validator (and `prettier --check`) before changing any content file. A rendered review sheet
of the current artwork set is kept at `content/qa/covers-contact-sheet.png`.
