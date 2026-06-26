# WordPress Import — Compatibility Context

Resume doc for agents and future work. Last updated after commits `9d9b37b` (native blocks + metadata) and `99d9f8c` (layout mapping + pages API + re-import).

See also: [`intent-wordpress-import.md`](./intent-wordpress-import.md) (original phase-1 scope; several items marked deferred there are now done).

---

## Goal

Import WordPress `content.rendered` as **editable native NextPress blocks** (not opaque HTML blobs), with preview/publish/editor parity and enough Gutenberg coverage for real wordpress.org/news-style posts.

---

## Architecture (current)

```
WP REST API (posts | pages)
        ↓
adapters/posts-adapter.ts | adapters/pages-adapter.ts
        ↓
map-wp-post.ts | map-wp-page.ts  →  html-to-blocks.ts
        ↓                              ↓
extract-import-element-meta.ts   map-gutenberg-layout.ts
        ↓
NextPress insert/update (posts | pages) + other.import.raw
```

**Parser model:** Top-level HTML from `content.rendered` is walked recursively. Gutenberg layout wrappers map to native blocks; unmappable markup falls back to `core/html` (lossless HTML string).

**Storage:** Blocks live in `posts.blocks` / `pages.blocks` (JSONB). Import provenance in `other.import` (`source`, `domain`, `wpId`, `wpLink`, `importedAt`, `raw`).

---

## Implemented

### Entity level

| Feature | Status | Notes |
|---------|--------|-------|
| Discover site | ✅ | `/api/import/wordpress/discover` |
| List/import **posts** | ✅ | UI at `/admin/import/wordpress` |
| List/import **pages** | ✅ API only | `GET/POST /api/import/wordpress/pages` — needs `siteId` |
| Re-import (update) | ✅ | Same `wpId` + domain → updates post in place (not skip) |
| Duplicate skip | ⚠️ | Only when `updatePost`/`updatePage` not wired; posts route wires update |
| Featured image | ✅ | `reference` \| `copy` (sideload) |
| Inline images | ✅ | Sideload in `copy` mode via `resolveContentImage` |
| Categories/tags | ✅ | Names resolved (up to 100 terms fetched); stored in `other` |
| Raw WP payload | ✅ | `other.import.raw` |

**Not imported:** authors (importer user used), comments, users, media library bulk, menus, theme chrome, SEO plugin meta, custom fields, CPTs.

**List filter:** UI and adapters only fetch **`status=publish`** from WP.

### Post/page fields mapped

Title, slug, excerpt, status (`pending`/`future` → draft), `publishedAt`, featured image, blocks, categories/tags (posts), `other.import.*`.

Password-protected posts: not mapped (`password: null`).

### Native block mapping (`html-to-blocks.ts`)

| Source | NextPress block |
|--------|-----------------|
| `h1`–`h6` | `core/heading` (`format: "html"` when inline markup) |
| `p` | `core/paragraph` |
| `ul` / `ol` | `core/list` (`values` as HTML `<li>` string) |
| `blockquote` | `core/quote` |
| `img` / image `figure` | `core/image` |
| `hr` | `core/separator` |
| `wp-block-columns` | `core/columns` (container + `settings.columnLayout` + nested `children`) |
| `wp-block-buttons` | `core/buttons` (structured `data.buttons[]`) |
| `wp-block-gallery` | `core/gallery` |
| `wp-block-group` / bare layout wrappers | Unwrapped — children promoted |
| Everything else at top level | `core/html` |

**Dependency:** `node-html-parser@7.1.0` (pnpm). Shared sanitizer: `shared/sanitize-html.ts`.

### Metadata (Phase 1 — `extract-import-element-meta.ts`)

On **native** blocks only (not `core/html` blobs):

- `id` → `content.anchor`
- `has-text-align-*` → `content.textAlign`
- `has-drop-cap` → `content.dropCap`
- `alignwide` / `alignfull` / etc. → `content.align`
- `size-*` → `content.sizeSlug` (images)
- Remaining classes → `content.className` (redundant `wp-block-*` stripped)
- Inline `style` → `block.styles` (allowlisted subset)
- Image `width`/`height` attrs → styles
- `data-*`, `aria-*`, `role` → `other.attributes`

### Rendering parity (imported content)

- `format: "html"` on paragraph/heading (client + SSR)
- List bullets + indent (client + SSR)
- Top-level block stack gap `1.5rem` — preview, publish, editor (`PAGE_BLOCK_STACK_GAP`)
- Publish container centering (`mx-auto`)

### Tests

Vitest project `shared` — **25 tests** under `shared/import/wordpress/`:

- `html-to-blocks.test.ts` (incl. layout + metadata)
- `extract-import-element-meta.test.ts`
- `map-wp-post.test.ts`

Run: `pnpm exec vitest run shared/import/wordpress/`

### Commits (main)

1. `9d9b37b` — HTML → native blocks, metadata, sideloading, render parity
2. `99d9f8c` — Gutenberg columns/buttons/gallery, re-import update, pages API

---

## Verified on real content (browser, local)

| Post | wpId | Blocks | Notes |
|------|------|--------|-------|
| Armstrong | 20583 | 66 | ~65 native + 1 `core/html` (buttons) before layout commit; re-import to pick up native buttons |
| Kim Parsell | 20927 | 10 → fewer `core/html` after layout commit | columns + buttons should be native after re-import |
| WCEU recap | 20793 | — | Imported pre-metadata; re-import for metadata |

**Re-import:** Select same post again in UI (or POST import with same wpId) — updates content, keeps slug.

**Dev server:** Restart required after shared import code changes (`tsx` does not hot-reload server modules). Graceful stop (`Ctrl+C`) avoids PGlite corruption; stale `postmaster.pid` or corrupted DB may require moving `data/pglite` aside.

---

## Partial / API-only

| Item | Gap |
|------|-----|
| **Pages UI** | Backend complete; admin UI still posts-only. Pages tab shows count + API hint. Needs site picker (`siteId`). |
| **Discovery** | Page-only WP sites now discover OK; posts count may be 0. |
| **Nested columns** | Single-level columns work; columns inside columns untested. |
| **Buttons styling** | Link `style` partially merged; full WP button theme classes not mapped to block styles. |

---

## Not implemented (backlog)

Ordered by typical impact for wordpress.org/news-style content:

### Block mapping

- [ ] `core/table` ← `<table>` / `wp-block-table`
- [ ] `core/group` ← retain as container (vs unwrap) when semantic grouping matters
- [ ] `core/cover` ← `wp-block-cover`
- [ ] `core/media-text` ← `wp-block-media-text`
- [ ] `core/spacer` / `core/separator` variants ← `wp-block-spacer`, styled separators
- [ ] `core/code` / `core/preformatted` ← `pre`, `code`
- [ ] Embeds (`iframe`, `wp-block-embed`) — need embed block or oEmbed preservation policy
- [ ] Multi-image figures without gallery class → gallery heuristic?
- [ ] Parse **nested** Gutenberg inside columns (already recursive for direct children; verify deep trees)

### Entity / workflow

- [ ] Pages import UI (site selector, list, import button)
- [ ] Draft/private post listing and import
- [ ] Custom post types (`wp/v2/{cpt}`)
- [ ] Comments import
- [ ] Users / author mapping
- [ ] Media library import (standalone)
- [ ] WP authenticated REST (private sites)
- [ ] Import options: “create only” vs “update” vs “skip duplicates” (update is default when record exists)

### Metadata Phase 2+

- [ ] Map WP block supports to NextPress block settings (typography presets, colors)
- [ ] Preserve `wp-block-*` class hooks where renderer expects them
- [ ] Column flex-basis → `columnLayout.width` (partially done via inline style parse)

### Quality

- [ ] E2E test: discover → import → publish → editor block count
- [ ] Fixture HTML from Armstrong/Kim Parsell in unit tests (regression)
- [ ] Document `core/html` count metric per post in import response (debug aid)

---

## Key files

| Path | Role |
|------|------|
| `shared/import/wordpress/html-to-blocks.ts` | Main parser entry |
| `shared/import/wordpress/map-gutenberg-layout.ts` | Columns, buttons, gallery, separator builders |
| `shared/import/wordpress/extract-import-element-meta.ts` | Class/style/attr → block fields |
| `shared/import/wordpress/map-wp-post.ts` | Post field mapping |
| `shared/import/wordpress/map-wp-page.ts` | Page field mapping (reuses post parser) |
| `shared/import/wordpress/create-wordpress-importer.ts` | Batch import + re-import logic |
| `shared/import/wordpress/adapters/posts-adapter.ts` | WP posts REST + discover |
| `shared/import/wordpress/adapters/pages-adapter.ts` | WP pages REST |
| `server/routes/import.wordpress.routes.ts` | API routes |
| `client/src/components/import/WordPressImportFlow.tsx` | Admin UI (posts) |
| `shared/sanitize-html.ts` | Shared HTML sanitizer |
| `backup/wp-import-compat/intent.md` | Intent for layout/re-import/pages batch |

---

## API quick reference

```http
POST /api/import/wordpress/discover     { siteUrl }
GET  /api/import/wordpress/posts        ?baseUrl=&page=&per_page=
POST /api/import/wordpress/posts        { baseUrl, blogId, wpIds[], featuredImageMode }
GET  /api/import/wordpress/pages        ?baseUrl=&page=&per_page=
POST /api/import/wordpress/pages        { baseUrl, siteId, wpIds[], featuredImageMode }
```

Import response shape: `{ imported[], updated[], skipped[], failed[] }`.

---

## How to resume

1. Read this file + run `pnpm exec vitest run shared/import/wordpress/`.
2. Pick a backlog item (table mapping or pages UI are good next steps).
3. Add/adjust tests in `html-to-blocks.test.ts` with real WP HTML snippets.
4. Restart dev server before manual import verification.
5. Re-import a known post and compare `core/html` count before/after.

---

## Known tradeoffs

- **Rendered HTML only** — no Gutenberg block JSON; structure depends on WP’s server-side render.
- **Top-level walk** — content inside unmappable wrappers stays one `core/html` until that wrapper type is handled.
- **Author** — always the logged-in importer, not WP author.
- **Re-import** — replaces all blocks; no merge/diff UI.
- **Taxonomy** — names only, not term IDs; no auto-create of missing categories in NextPress.
