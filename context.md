# Project context (agent handoff)

Per **AGENTS.md → Workflow**: use `task.md` for work **>30min**; at **task end**, update this file with **learnings, new patterns, tradeoffs** so future agents can pick up quickly.

---

## 2026-08-06 — Responsive & adaptive 2X

### Summary

- **Single render contract:** `shared/resolve-block-for-surface.ts` — canvas, preview, SPA, SSR all merge responsive defaults + tokens + device CSS the same way
- **Publish CSS unified:** `shared/publish-block-css.ts` injected via `PublishBlockStyles` (client) and `PageTemplate` (SSR)
- **Device overrides on publish:** `shared/collect-device-styles-css.ts` emits `@media` from `block.other.deviceStyles` (was editor-only)
- **Editor WYSIWYG:** `DevicePreview` uses CSS container queries (`npb-canvas`) + `resolveBlockForSurface` in `useBlockState`
- **Defaults:** container/image/media-text updated; runtime fallbacks in `shared/render-defaults.ts` for legacy content
- **Validation:** `validateBlockResponsiveHealth()` in shared + SDK; `ResponsiveHealthBanner` in editor sidebar
- **Audit:** `docs/internal/responsive-audit.md`; design-system §21

### Patterns

- Responsive = automatic CSS/render rules; adaptive = opt-in `deviceStyles` when user edits on tablet/mobile
- Vertical slice proof: layout → media → typography → interactive (shared contract first, then block fixes)
- Golden fixtures: `shared/test/fixtures/responsive/fixtures.ts`

### Tradeoff

- Container queries approximate mobile `@media` in editor edit mode; iframe live preview uses real `@media` via preview route
- SSR and client now share `resolveTokenEntryValue` for theme token resolution

### Gate 3 — **CLOSED** (2026-08-06)

- **36/36** browser matrix @390/768/1280 on layout/content/typography fixtures × editor/preview/SPA/SSR
- Run: `pnpm audit:gate3-responsive` (report: `docs/internal/gate3-responsive-report.md`)
- Fixes: UA `figure` margin reset in publish CSS; editor canvas `npb-canvas-page` class + container queries @768 with `!important` on column stack; `DevicePreview` `width:100%` on tablet/mobile

### Polish — **DONE** (2026-08-06)

- **Apply mobile-friendly defaults:** `persistResponsiveDefaultsToBlocks()` in `shared/persist-responsive-defaults.ts`; Page menu + sidebar health banner CTA
- **SSR token parity:** `shared/resolve-token-entry.ts` resolves `entry.value` theme tokens; `resolveTokenMapForSSR` unified; `PublicBlockRenderer` no longer double-resolves tokens
- **Iframe live preview:** Eye toggle in builder top bar → `IframeDevicePreview` loads `/preview/...?live=1&embed=1` at device width (true `@media`)

### Optional (deferred)

- Full iframe preview in gate3 audit matrix row (manual sign-off sufficient for now)

### Golden fixtures (2026-08-06)

- Full layout / content / typography stress trees in `shared/test/fixtures/responsive/fixtures.ts`
- **Demo workflow pages** (SaaS, café, portfolio, blog, newsletter): `shared/test/fixtures/demo-pages/` — seed with `pnpm seed:demo-pages -- --via-api` (see `docs/internal/demo-pages.md`)
- Seed published pages:
  - PGlite (stop dev server first): `pnpm seed:responsive-fixtures`
  - API (dev server running): `pnpm seed:responsive-fixtures -- --via-api`
  - Optional env: `SEED_EMAIL`, `SEED_PASSWORD`, `SEED_BASE_URL`

### SSR fix (2026-08-06)

- `/pages/:id` no longer uses theme stub — `server/routes/shared/build-published-page-html.ts` shared with `/sites/:siteId/:pageSlug`

---

## 2026-08-07 — Builder library and inspector split

### Summary

- Extracted reusable `BuilderLibraryPanel` and `BuilderInspectorPanel` bodies.
- `BuilderResponsiveSidebar` mounts exactly one tree: split rails at `1280px`, existing tabbed sidebar below.
- Wide rails use `18rem` library and `22rem` inspector CSS tokens around a flexible canvas.

### Patterns and tradeoffs

- `useMediaQuery` uses `useSyncExternalStore`, avoiding component effects and duplicate DnD IDs.
- Library remains mounted in wide mode; compact mode preserves existing tab behavior and collapse control.
- Library accordion state belongs to shell instance, so viewport crossing resets fold state.

### Verification

- Focused builder tests: **19/19** passed.
- `pnpm build` transformed 3,703 modules, then environment terminated chunk rendering with exit 143.
- Full type-check still reports pre-existing unrelated diagnostics; no new diagnostics from this slice.

---

## 2026-08-07 — Foundational UX and QA (targeted pass)

### Summary

Implemented the approved **targeted** slice of the Foundational UX plan. Structural items remain **approval-gated** (see deferred list below).

### Navigation and site correctness

- **`client/src/lib/admin-content-routes.ts`**: canonical builder paths (`postEditorPath`, `pageEditorPath`)
- **BlogMenu** → `/admin/page-builder/post/:id` (was broken `/admin/posts/:id/edit`)
- **Dashboard** recent titles + edit icon → post builder
- **PagesMenu** → wouter nav (no hard reload); cmdk `value` includes title/slug
- **`useContentLists`** + **MediaPickerDialog** → `activeSiteId` in query keys and upload URL
- **CreateContentDialog** post path → `/admin/posts?create=true&title=…`; **Posts** opens create dialog from URL

### List UX (no shared framework migration)

- **`AdminListPaginationFooter`**: totals always visible, even on one-page results
- **Posts/Pages**: title links to builder, inline **`ContentStatusSelect`** with `expectedVersion`, search resets page + “current page only” hint
- **Media**: thumbnail/filename open details dialog; shared pagination footer

### Builder / loading

- **`index.html`**: minimal pre-React theme-aware background (reduces white flash)
- **CreatePageModal** opens in-builder from PagesMenu (`onCreateNewPage`)
- **BlockRenderer**: persistent `npb-canvas-block-selected` outline; toolbar stays visible when selected
- **`resolve-spacing-sides.ts`**: padding/margin highlight parity (shorthand + longhand)
- **PageBuilder** delete → toast with Undo (invalidated after further edits)
- **ImageBlock**: tokenized resize handles (`.npb-image-resize-handle`)
- **renderer/react/media**: `maxWidth: 100%` on published images

### Tests added/updated

- `BlogMenu.test.tsx`, `Dashboard.test.tsx`, `BlockRenderer.test.tsx`, `useContentLists.test.tsx`, `resolve-spacing-sides.test.ts`
- **42/42** targeted vitest pass (2026-08-07)

### QA backlog — still deferred (explicit approval required)

1. Shared content-list framework + multi-screen migration
2. Persistent admin route shell / Suspense redesign
3. Header Save / Ctrl+S persistence unification
4. Global column `children` / `columnLayout` reconciliation
5. Global Command/Ctrl+K palette
6. Backend/SDK search, sorting, drag ordering, DB changes

Decision packets for each deferred item live in the plan dossiers; **`backup/foundational-ux-qa/intent.md`** records this pass scope.

### Tradeoffs

- List search remains client-side on the loaded page only (labeled in UI); server-backed search/sort needs API approval
- Delete undo uses undo stack (one step); further edits invalidate the toast action
- `pnpm check` still reports pre-existing server/shared TS errors unrelated to this pass

---

## 2026-08-07 — Deferred UX architecture slices

### Implemented

- **Admin route shell:** `AdminChrome` now owns persistent top bar/sidebar outside the
  route `Suspense` boundary for authenticated admin content. `AdminLayout` remains a
  standalone-compatible page frame. Builder, public, auth, and setup routes keep their
  own chrome.
- **Global palette:** authenticated Ctrl/Cmd+K navigation/create palette uses active-site
  content results, ignores editable fields, and leaves destructive actions out of scope.
- **Builder split:** wide view uses fixed library and inspector rails at 1280px and above;
  compact view retains the tabbed sidebar. `useSyncExternalStore` selects one tree, so DnD
  IDs are not duplicated.
- **Save path:** header Save and builder Ctrl/Cmd+S now call one parent-owned remote save
  operation. `editor-save-target.ts` resolves endpoint/version and payload shape. Local
  draft storage remains separate. Page settings now sends `expectedVersion`; inline publish
  targets the inline post rather than its parent page.
- **Columns:** `reconcileColumnLayouts` is pure, deterministic, idempotent, and
  diagnostics-only. It removes stale references and duplicate memberships, then places
  direct orphans in first-column child order.

### Verification

- Full suite: **95 files, 702 tests passed**.
- Production build: `pnpm build` passed.
- Focused deferred tests: route shell, global palette, save target, list primitives,
  builder inspector/responsive split, and columns reconciliation passed.
- `pnpm check` still reports the previously documented server/shared TypeScript errors;
  no new errors came from these slices.

### Still contract-gated

- Backend/SDK search and sorting semantics, database/index changes, persisted view
  preferences, and drag ordering remain unimplemented. No database command or migration
  ran. Reorder needs resource-specific policy and concurrency behavior before code.
- Full migration of Media, Comments, and Templates remains deferred after the Posts/Pages
  list pilot.

> NOTE 2026-08-15: STALE — since superseded. Server-backed sort/reorder/list-mode/pagination
> now exist on Posts/Pages (posts.routes.ts:109-128,172-189; pages.routes.ts:118+,183;
> shared/content-list-query.ts) and Media (media.routes.ts:50-68). Media migrated to the
> shared content-list primitives. Comments/Templates/Users still use legacy list markup.

### Safety

- Deferred backups live under `backup/foundational-ux-qa/deferred-before-*`.
- Decision record: `backup/foundational-ux-qa/intent.md`.

---

## 2026-08-07 — Shared content-list foundation pilot

### Summary

- Added typed list primitives under `client/src/components/admin/content-list/`.
- Moved pagination behavior into `ContentListPaginationFooter`; legacy `AdminListPaginationFooter` import remains compatible.
- Posts and Pages now import pagination from the new domain. Media, Comments, and Templates remain unchanged.
- Query keys, current-page-only semantics, page reset, and row/action markup remain
  page-owned; Posts and Pages now use the shared typed search toolbar.

### Verification

- Focused list tests: **14/14** (`content-list.test.tsx`, `useContentLists.test.tsx`)
- Reversible backups: `backup/foundational-ux-qa/deferred-before-list/`

### Tradeoff

- Toolbar and pagination primitives are wired only into Posts and Pages to limit migration
  surface. Media, Comments, and Templates retain their existing list implementations.

---

### Summary

- SDK **0.2.0**: `validateBlockTree`, `patchBlockTree`, `buildBlockSchemaCatalog`, `pages.patchBlocks` / `posts.patchBlocks` (get→patch→validate→update + change summary)
- Server: `validateContentForSave` rejects `UNKNOWN_BLOCK` via `shared/known-block-names.ts` (no DB migration)
- MCP **0.2.0**: tools `validate_blocks`, `patch_page_blocks`, `patch_post_blocks`; resource `nextpress://blocks/schema`
- Live MCP integration: 7/7 including patch insert without full tree replace

### Tradeoff

- Patch is client-composed then PUT (same concurrency). Dedicated server JSON-Patch endpoint deferred.
- Keep `KNOWN_BLOCK_NAMES` aligned with SDK `BLOCK_NAMES` manually.

---

## 2026-07-24 — @nextpress-org/mcp package (v0.1.0)

### Summary

- New package `packages/mcp/` — **`@nextpress-org/mcp`** stdio MCP server
- Thin adapter: tools/resources → `@nextpress-org/sdk` → existing `/api/*` REST (no Agent API yet)
- Bin: `nextpress-mcp`; env `NEXTPRESS_URL` + `NEXTPRESS_API_KEY` + `NEXTPRESS_SITE_ID` (all required; siteId matches SDK)
- Content-core tools: site context, pages/posts CRUD, publish_page, templates, media upload, preview_page, list_block_types, build_blocks
- Resources: `nextpress://blocks/catalog`, `nextpress://site/map`, `nextpress://site/context`
- Safe CMS co-ownership: draft defaults, `expectedVersion` on updates, clear `VERSION_STALE` hints
- Root scripts: `pnpm mcp:build|test|dev|typecheck`
- Docs: `docs/mcp/getting-started.md`, package README
- SDK version aligned to **0.1.0** (was 0.0.1)

### Patterns

- Factory-only MCP wiring (`createMcpServer`, `createMcpClient`, `parseMcpConfig`)
- Tool domains split under `src/tools/*` (≤400 LOC)
- `formatSdkResult` / `runTool` for agent-readable errors
- `@modelcontextprotocol/sdk` v1 (`McpServer` + `StdioServerTransport`)

### Tradeoff

- Skipped strategy Phase 1 Agent API; MCP wraps human REST via SDK. Fine for Cursor/Claude content work; semantic `patchBlocks` / schema registry still future.

---

## 2026-07-02 — @nextpress-org/sdk package (v0.1.0)

### Summary

- New publishable package at `packages/sdk/` — **`@nextpress-org/sdk`**
- Factory API: `createNextpress({ baseUrl, apiKey, siteId? })` → typed resource namespaces
- **tsup** ESM build + `.d.ts`; **vitest** (16 tests); **bun vitest run** also works
- All public methods have JSDoc; all inputs validated with **Zod** before HTTP
- **`NextpressError`** for API failures (`status`, `code`, `body`)

### Resources wired

`posts`, `pages`, `blogs`, `comments`, `media`, `users`, `sites`, `site`, `settings`, `options`, `templates`, `themes`, `dashboard`, `preview`, `public`, `import`, `system`, `health`, `auth`, plus **`blocks`** builder helpers

### Blocks

No standalone blocks REST API — blocks live on page/post/template payloads. SDK exposes `nextpress.blocks.heading()`, `.paragraph()`, `.container()`, etc. to build `BlockConfig[]` trees.

### Auth

SDK sends `Authorization: Bearer npk_live_…`. Server validates API keys on protected routes. **Keys are issued and revoked in the dashboard only** (`Settings → System → API Keys`, session required). SDK does not manage keys.

### Monorepo scripts

- `pnpm sdk:build`, `pnpm sdk:test`, `pnpm sdk:dev`
- Root `vitest.config.ts` includes `sdk` project

### Patterns

- Self-contained types in `packages/sdk/src/types/` (not `@shared` import) so package is publishable standalone
- Resource factories: `createPostsResource({ http })` — no classes, AGENTS.md compliant
- Default `siteId` merged into query via `withSiteId()` in HTTP client

### Testing & lint (2026-07-02)

- **54 unit + 7 live tests** (`src/test/`, `vitest.live.config.ts`)
- **Biome 2.5** — `pnpm sdk:lint`, `pnpm sdk:lint:fix`
- Integration tests: `pnpm sdk:test:integration` (dev server + `integration.config.ts` + API key)
- Integration tests: `pnpm sdk:test:integration` — configure `packages/sdk/src/test/integration/integration.config.ts` (copy from `.example.ts`)

### SDK v0.1 expansion (2026-07-02)

- **~97% REST endpoint coverage** — added `plugins`, `hooks`, expanded `auth` (signIn/signUp/signOut)
- **`nextpress.createEditorSession()`** — undo/redo, save, publish, preview links
- **Resource methods** (`pages`, `posts`, `templates`, `preview`) — scripts and automation
- **35 block helpers** — full dashboard registry via `blocks.fromName()` + named helpers
- **Fully typed inputs/outputs** — no `Record<string, unknown>` on public resource methods; Settings/Import/System typed
- **Themes response shapes fixed** — match server (array / raw theme object)
- **`posts.list({ blogId })`** — dashboard alias normalized to `blog_id`

### SDK auth + editor session (2026-07-02)

- **Server API key validation** — `Bearer npk_live_…` on content routes; keys hashed at rest
- **Dashboard-only key management** — `Settings → System → API Keys`; `requireSessionAuth` blocks Bearer on key routes
- **Site-scoped API keys** — scoped keys reject cross-site `siteId` in `requireAuth`
- **Content access checks** — draft/non-public GET requires auth; preview tokens require site access
- **Preview share rate limit** — 60 req/min/IP on `/api/preview/shared`
- **Expired preview token cleanup** — purged on token mint
- **SDK auth** — `auth.me()` only; no sign-in/sign-up in SDK

### API key scopes (2026-07-02)

- **Scoped permissions** — keys store `scopes jsonb`; admin picks presets or individual permissions at create time (`Settings → System → API Keys`)
- **Granular scopes** — `shared/api-key-scopes.ts`: per-resource read/write (pages, posts, blogs, …), presets, route→scope map, write implies read
- **Enforcement** — `apiKeyScopeEnforcer` middleware (Bearer `npk_live_…` only); session cookies bypass scopes; unmapped `/api/*` routes require full access (fail closed)
- **Migration 0004** — adds `scopes` column; **0005** backfills legacy empty scopes to full access
- **403 shape** — `{ code: "API_KEY_SCOPE_DENIED", requiredScopes: [...] }` when key lacks permission
- **SDK** — `NextpressError.code` surfaces API `code`; README documents scope presets and resource mapping
- **SDK docs** — `docs/sdk/` (getting started, architecture, resources, blocks, preview, development)

### Rules (see **`docs/internal/COPYWRITING.md`** and **AGENTS.md → Consumer-facing copy**)

- Admin UI copy is for **site owners**, not engineers. No em dashes. No API names, filter/query jargon, "UX", or implementation detail unless it directly helps the user act.
- **What's New** highlights in `shared/release/release-manifest.ts` with `kind`:
  - `update` → orange **New feature**
  - `fix` → red **Bug fix**
  - `improvement` → blue **Improvement**
- UI rendering: `WhatsNewHighlightItem` + `RELEASE_HIGHLIGHT_META` in `shared/release/release-highlight-meta.ts`.
- Deploy GitHub release notes (`scripts/publish-github-release.ts`) may stay technical (Docker tag, CLI); in-app dialog stays plain language.

### Version bump (deploy)

- Default: patch +1; at patch **10** roll to next minor (`1.0.10` → `1.1.0`). See `shared/release/bump-version.ts`.
- Manual: `pnpm version:bump --minor|--major|--patch`, `pnpm version:set 1.2.0`, `pnpm deploy -- --version 1.2.0`.
- Deploy requires **clean git tree**; publishes GitHub release tag `vX.Y.Z` after Docker push.

---

## 2026-06-21 — Better Auth migration

Intent: [`docs/internal/intent-better-auth.md`](docs/internal/intent-better-auth.md)

### Summary

- **Replaced** Replit OIDC + express-session + `/api/auth/login|register|logout` with **Better Auth** (`better-auth` package).
- **Kept** existing `users` table (added `name`, `email_verified`, `display_username`); passwords live in `accounts` (`credential` provider); bcrypt preserved.
- **Server**: `server/lib/better-auth.ts`, `toNodeHandler(auth)` at `/api/auth/*`, `GET /api/auth/user` compatibility route.
- **Client**: `client/src/lib/auth-client.ts`; Login/Register use `authClient.signIn` / `signUp`; logout uses `signOut`.
- **Removed**: `server/replitAuth.ts` → `/trash/replit-auth-20260621/`.
- **Env**: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` (optional; see `getAuthBaseUrl` / `getAuthSecret` in `server/config.ts`).

---

## 2026-05-15 — Page builder editor UI (verified in workspace)

- **Editor sidebar shell**: `BuilderSidebar` root uses class `npb-editor-sidebar` (dark zinc chrome: `bg-zinc-950`, `border-zinc-700`, etc.).
- **BlockSettings tabs**: `TabsList` is **3 columns** — **Content** | **Style** | **Advanced**. **Display Conditions** (`ConditionBuilder`) lives only under **`TabsContent value="advanced"`**, not a top-level tab.
- **Contrast / dark chrome**: See **`docs/design-system.md`** §16; repo artifact = `client/src/index.css` — scoped `.npb-editor-sidebar` overrides + sidebar field/tab utilities.
- **Backups**: No `backup/` directory and no `*.20260514-contrast` files found in this workspace (if they exist locally, path may differ or be untracked).
- **Sidebar header (current code)**: Title string **`Nextpress Builder`**; adjacent **ghost** button calls **`onToggleSidebar`** (collapse/hide sidebar) — **not** a light/dark theme control.
- **Fold-all / “NextPress Editor” title / sidebar theme toggle**: **Not found** in `BuilderSidebar` / `PageBuilderEditor` via search; treat as **pending verify** if another agent is adding them elsewhere.

---

## 2026-05-15 — Local admin login (agent verification)

- **Purpose**: Hand off how agents can sign in or create a dev account, then verify page builder UI.
- **Base URL**: `http://localhost:5000` — HTTP port follows **`PORT`** when set; otherwise server defaults to **5000** (see `server/index.ts`).
- **Check setup**: `GET /api/setup/status` → `{ isSetup: true|false }`. If false, use initial setup flow (not register).
- **Fresh PGlite / no user yet**: create an account at **`/admin/register`**, then sign in at **`/admin/login`**.
- **Do not assume fixed credentials** — each dev PGlite may have different users or none. Register a new account when sign-in fails.
- **Register form fields**: username, email, first/last name, password, role (default subscriber is fine for builder audits).
- **Username rules**: alphanumeric and underscore only — **no hyphens** (Better Auth rejects e.g. `nextpress-agent`).
- **Password rules**: min 8 chars, at least one uppercase, lowercase, and number.
- **API register** (same as register page): `POST /api/auth/sign-up/email` with header `Origin: http://localhost:5000` and body `{ email, password, name, username, firstName?, lastName? }`.
- **API sign-in**: `POST /api/auth/sign-in/email` with same `Origin` header and `{ email, password }`. Confirm via `GET /api/auth/user`.
- **Page builder**: After login, **`/admin/pages`** → edit a page, or **`/admin/page-builder/page/<id>`**.
- **How verified**: Cursor **IDE browser MCP** or curl session — sign in, open builder, toggle light/dark in top bar.

---

## 2026-06-03 — Global Theming System Migration

Full report: [`docs/design-system.md`](docs/design-system.md)

### What Changed

- **Global token system**: ~40 CSS custom properties at `:root` (light) and `.dark` (dark) in `index.css`
- **Tailwind registration**: All tokens registered as `npb-*` colors in `tailwind.config.ts`
- **ThemeProvider**: `client/src/components/ThemeProvider.tsx` — manages `.dark` class on `<html>`, persists to `localStorage` key `npb-theme`
- **`useTheme()` hook**: Returns `{ theme, toggleTheme, isDark }`
- **Theme toggles**: TopBar (global sun/moon) — canvas-only override removed 2026-06-12
- **shadcn + `.dark` gotcha**: Light shadcn vars live in a second `:root {}` block *after* the first `.dark {}` npb block. Dark shadcn overrides must be in a **second `.dark {}` placed after that `:root` block**, or `--background` / `--muted` / `--card` stay light while npb tokens flip — breaks outline buttons, selects, and tab chrome in the builder.
- **Sidebar merged**: Removed local `useState<SidebarChromeTheme>`, now uses global `useTheme()`
- **Shared utilities**: `OptionButton`, `OptionGroup`, `SettingsLabel`, `SurfaceCard` in `client/src/components/PageBuilder/shared/`
- **All 36 blocks migrated**: Use tokens and shared utilities, no hardcoded Tailwind colors
- **All shell files migrated**: BuilderSidebar, TopBar, Canvas, Library, PageSettings, BlockSettings, TokenColorPicker, AnimationPicker
- **Legacy code removed**: `!important` overrides, `.npb-editor-sidebar--light`, sidebar-local theme state, dead `.dark` sidebar shadcn tokens

### Design system

All agents working on UI MUST read **`/docs/design-system.md`** before making any UI changes — single source for character, theory, taste, patterns, tokens, motion, and migration.

---

## 2026-05-15 — Block settings UX principles (editor)

Guidance for block sidebar settings (Page Builder and similar):

- **Prefer sensible dimension presets** (height auto, SM / MD / LG / full viewport, common max-widths aligned with page layout) **over blank freeform fields** as the primary control. Keep a **Custom** path with a real input for arbitrary CSS when the persisted model is still raw `styles` / CSS strings.
- **Avoid unusable empty-looking controls**: use labeled placeholders, preset chips (`npb-settings-chip` in sidebar), or selects so users see current mode. Where users edit **numeric lengths**, offer an explicit **px | rem** toggle that only activates for simple `number + unit` values so `calc()`, `%`, and multi-value shorthand are never blocked.
- **Reusable color UI**: text and background picks should **standardize on the same pattern as paragraph blocks** — `TokenColorPicker` in `client/src/components/PageBuilder/TokenColorPicker.tsx`, wired through `block.other.tokenMap` with `currentStyleValue` fallback from `block.styles` for legacy data. Extend that component or shared wrappers rather than inventing parallel color inputs per block.

### 2026-05-16 — Borders & contrast (editor settings)

- **Borders (sidebar settings)**: Avoid harsh stacked chrome. Prefer **hairlines** and **opacity-tiered** borders like `.npb-editor-sidebar` tokens in `client/src/index.css` (`--npb-coll-header-divider` / `--npb-settings-panel-border` / `--npb-chip-*`, collapsible card tier). Do not wrap every control in `.npb-settings-panel` when the parent is already a collapsible card — that reads as “card in card” with **double** hard edges; match **BlockSettings** (e.g. `TokenColorPicker` without an extra panel shell) unless a well is truly needed.
- **Contrast (summary)**: See **`docs/design-system.md`** §9–§16; in the builder sidebar, respect **shell vs panel vs card** separation via `--npb-sidebar-*` in `index.css`. Avoid **white-on-white** in dark chrome; keep **shadcn** primitives but rely on scoped `.npb-editor-sidebar` remaps so fields stay legible.

---

## 2026-06-03 — Blocks & Page Builder Audit (comprehensive)

Full report: [`docs/blocks-report.md`](docs/blocks-report.md)

### Key Findings

- **36 blocks registered** (26 core + 10 post), not 42 as README claims. README inflates "4 icon sets" as 4 blocks (it's 1 block with 4 icon libraries).
- **1 orphan block**: `post-new` (267 LOC) exists at `blocks/post-new/` but is NOT registered in `index.ts`. Unreachable.
- **Auto-save is FALSE** — README claims it exists but zero auto-save is implemented. Only manual Ctrl+S writes to localStorage.
- **Block deselection bug** — clicking any settings control deselects the block (race condition in `PageBuilder.tsx` between `useUndoRedo.currentState` and separate `useState`).

### Canonical Block Pattern (heading block as reference)

All blocks should follow `blocks/heading/HeadingBlock.tsx` structure:
1. TYPES → 2. CONSTANTS → 3. UTILITIES → 4. RENDERER (pure) → 5. MAIN COMPONENT (useBlockState → Renderer) → 6. SETTINGS (CollapsibleCard) → 7. BLOCK DEFINITION

Complex blocks (>400 LOC) should use icon block's 3-file split: `Block.tsx` + `block-settings.tsx` + `block-model.ts`.

### Settings Pattern Divergence

- **Pattern A** (26 core blocks): `setUpdateTrigger` force-render hack — heading block style
- **Pattern B** (10 post blocks): Direct accessor, reads stale `block.content` — post-title style
- **Recommendation**: Unify on Pattern A. Extract `useSettingsState(block)` hook to eliminate boilerplate.

### Reusability Gaps

- `TokenSpacingPicker` is **dead code** (0 consumers). BlockSettings uses `FreeformSpacingSideRow` instead.
- No `createBlockDefinition()` factory — 36 blocks repeat identical boilerplate.
- No shared `BlockShell` wrapper — every block builds className + styles + animation attrs independently.
- No shared `LinkSettings` or `MediaUrlField` — 6-7 blocks implement these independently.
- Renderer has parallel type system (`BlockData` vs `BlockConfig`) and parallel component set.

### 15 of 36 blocks exceed 400 LOC limit

Worst offenders: columns (754), group (710), container (577), post-list (561), image (515).

---

## 2026-06-03 — Phase 7 Complex Fixes (8 tasks complete)

Full spec: [`docs/phase7-tasks.md`](docs/phase7-tasks.md). Tracker: `task.md`.

### Corrections to earlier audit findings (the spec doc predated current code)

- **Auto-save IS implemented** (audit said FALSE). It lives at the **parent** level, not in `PageBuilder`: `PageBuilderEditor.queueDraftSave` (debounced 300ms → `savePageDraftWithHistory`), with restore-on-reload in the same file (`loadPageDraft`, uses local draft when `localTs > remoteTs`). `PageBuilder.commitBlocks → onBlocksChange → handleBlocksChange → queueDraftSave`.
- **Block deselection bug IS fixed** (audit described the race). `PageBuilder.tsx` no longer keeps dual state — `const blocks = currentState` (direct derivation); the propBlocks handler only deselects when the selected block no longer exists. If you see the audit's `useEffect(() => setBlocks(currentState))`, it's gone.

### New patterns / decisions

- **Spacing UX is freeform CSS + `UnitToggle`, NOT token chips.** Both `BlockSettings` (`FreeformSpacingSideRow`) and `ContainerBlock` write raw CSS to `block.styles`. `tokenMap` is used **only for color** (`TokenColorPicker`). `TokenSpacingPicker` was the last survivor of an abandoned token-spacing approach → **deleted** to `/trash/token-spacing-picker-20260603/`. Don't reintroduce token-chip spacing; it loses `auto`/`calc()`/`%` and forks the pattern.
- **Layout-block 3-file split** (icon-block pattern): columns/group/container each → `*-model.ts` (types/defaults/pure helpers, no React) + `*-settings.tsx` (settings UI) + `XBlock.tsx` (renderer + component + default-export `BlockDefinition`). Registry imports the default export, so split is internal. NB: the **main** `XBlock.tsx` must be < 400 LOC; settings files may be larger (reference `icon-block-settings.tsx` is 451). Tests importing `buildColumnsLayout`/`removeColumnAndCleanup` still work via a re-export from `ColumnsBlock.tsx`.
- **Markdown rendering**: public renderer uses `react-markdown` + `remark-gfm` (both already deps; XSS-safe — renders React elements, ignores raw HTML). Chose this over `MDEditor.Markdown` to avoid a ~1.7MB public-bundle hit (the editor preview still uses `MDEditor.Markdown`). `getMarkdownContent` handles `kind:"markdown"`/`"text"`/legacy `{content}`.
- **Custom DnD lib** (`lib/dnd/index.tsx`): the over-target index is tracked in `overState.index`; now surfaced as `DroppableStateSnapshot.placeholderIndex`. Consumers render the exported `DropPlaceholder` at that index (interleaved in `BuilderCanvas`, `ColumnsRenderer`, `ContainerChildren`). Auto-scroll is an rAF loop in the drag lifecycle (`findScrollableAncestor` → nearest scrollable, else window). All three drop paths already render `{provided.placeholder}`.
- **Keyboard shortcuts**: handled in `PageBuilder`'s mount-only keydown listener. Delete/Backspace/Escape/Ctrl+D are **guarded** against `INPUT/TEXTAREA/SELECT/contentEditable` so inline editing is never hijacked; undo/redo/save remain unguarded (existing behavior).

### Verification

Build green; full suite **453/453**. Fixed one stale theming-migration assertion in `HeadingBlock.test.tsx` (`bg-gray-200` → `bg-npb-interactive-bg-active`). UI behaviors (drag placeholder/auto-scroll, public markdown, in-app shortcuts) are build/test-verified only — still want a manual in-app pass. Backups in `/backup/phase7/`.

### Dev-server gotchas (learned 2026-06-04)

- **One `pnpm dev` at a time.** Two instances both bind `0.0.0.0:5000` (no port-in-use error) and corrupt Vite HMR port resolution → client tries `ws://localhost:undefined` → HMR/auto-reload dead. If HMR acts up, check `ps aux | grep "server/index"` for duplicates first.
- **HMR client port is now pinned**: `server/vite.ts` sets `hmr: { server, clientPort: parseInt(process.env.PORT||"5000",10) }` (mirrors the listen port in `server/index.ts:81`). Previously `hmr: { server }` alone could inject `ws://localhost:undefined`.
- **Adding a new React-using dep** (e.g. `react-markdown`) that isn't in `optimizeDeps.include` gets discovered lazily mid-load → a 2nd optimize pass → mismatched `?v=` chunk hashes → `Cannot read properties of null (reading 'useEffect')` app-wide (dev only; prod build dedupes fine). Fix: add it to `optimizeDeps.include` in `vite.config.ts` (react-markdown + remark-gfm already added).
- **Debugging tip**: `agent-browser` reproduced this — `open <url>` then `errors --json` / `console` surfaced the broken HMR ws + null-React stack pointing at `node_modules/.vite/deps/*` chunks with differing `?v=` hashes.

---

## 2026-06-18 — WordPress Import (Phase 1 — Posts)

Intent: [`docs/internal/intent-wordpress-import.md`](docs/internal/intent-wordpress-import.md)

### Approved tradeoffs

- **Gutenberg parser**: **Deferred** — v1 stores `content.rendered` as a single `core/html` block; raw JSON in `post.other.import.raw`
- **Featured images**: User chooses **reference** (external URL) or **copy** (sideload via `server/utils/sideload-remote-image.ts` → media row)
- **Server routes**: Approved — `/api/import/wordpress/discover`, `/posts` GET/POST
- **Taxonomy**: `shared/posts/post-other.ts` + `enrichPostForApi()` on posts/public GET; `PostInfoBlock` falls back to `other`
- **Blog**: Explicit picker on import UI (required)
- **Sidebar**: New **Tools** section → **Import WordPress** (`/admin/import/wordpress`); Posts list also has quick **Import from WordPress** dialog
- **Imported badge**: Posts table shows outline **Imported** badge when `isImported` from enriched API

### Architecture

```
shared/import/wordpress/
  types.ts, normalize-site-url.ts, fetch-wp-api.ts
  map-wp-post.ts, adapters/posts-adapter.ts
  create-wordpress-importer.ts   # factory + adapter registry (posts only)

server/routes/import.wordpress.routes.ts  # SSRF via validate-external-url.ts
```

### Deferred (documented, not implemented)

- Gutenberg → native `BlockConfig[]` conversion
- WP Application Passwords for draft/private posts
- Adapters: pages, media, comments, users
- Re-import / update by `wpId`

---

## 2026-07-10 — Page `other` defaults, save validation, preview icons, group settings UX

### Page `other` defaults (editor ↔ SDK parity)

- **Problem**: Editor-created pages stored `other: {}`; SDK/import pages got design + icon shell defaults. Runtime-only defaults in `PageContext` did not persist or match publish path.
- **Source of truth**: `shared/page-other.ts` — `DEFAULT_PAGE_DESIGN`, `DEFAULT_PAGE_ICONS`, `mergePageOtherWithDefaults()`, `parsePageOther()`, `validatePageOtherForSave()`, `enrichPageForApi()`.
- **Editor create**: `CreatePageModal` sends `other: mergePageOtherWithDefaults()` on POST.
- **SDK create**: `pages.create()` in `packages/sdk/src/resources/pages.ts` auto-applies `buildDefaultPageOther()` before POST. Export from SDK index: `buildDefaultPageOther`, `DEFAULT_PAGE_OTHER`, icon/tag type constants.
- **Server**: Page POST/PUT runs `validateContentForSave()` from `shared/validate-content-save.ts`; merges validated `other` on create. GET/POST/PUT responses use `enrichPageForApi()` so legacy `{}` pages show defaults in editor without DB rewrite until save.
- **Import**: `shared/import/wordpress/import-defaults.ts` re-exports design/icon defaults from `page-other.ts` (deprecated aliases kept).

### Optimistic concurrency (`expectedVersion`) — editor gaps fixed

- **Problem**: Top-bar Save/Preview in `PageBuilderEditor.tsx` sent `version` (pages only) or omitted it (posts/inline posts). Server requires `expectedVersion` on all page/post PUTs → 400.
- **Fix**: `handlePageBuilderSave` sends `expectedVersion`, strips visual content via `stripVisualContentFromBlocks`, updates React Query cache after save, handles `VERSION_STALE`. `PublishDialog` publish/unpublish include `expectedVersion`. `adaptPostToEditorData` preserves `post.version`.
- **Already correct**: In-canvas save via `usePageSave` in `PageBuilder.tsx`.

### Content save validation (backend)

- **Module**: `shared/validate-content-save.ts` + `shared/validate-icon-reference.ts`.
- **Icon indexes moved to** `shared/icons/` (lucide, svgl, react-icons); client `icon-indexes/*.ts` re-exports from `@shared/icons/*`.
- **On page/post create/update** (400 with codes):
  - `INVALID_ICON` — `iconSet` must be `lucide | react-icons | svgl`; name must exist in index (lucide kebab-case, PascalCase normalized; react-icons `prefix:Name`; SVGL slug).
  - `INVALID_BLOCK_TAG` — group/container `tagName` from `shared/block-tag-names.ts` unions.
  - `INVALID_PAGE_OTHER` — page icon settings + custom meta tag names (`shared/meta-tag-names.ts`).
- **Posts**: block validation only (taxonomy stays in `post.other` via `parsePostOther`).
- **SDK Zod**: `pageOtherSchema`, `iconSetIdSchema`, `groupHtmlTagSchema`, etc. in `packages/sdk/src/schemas/index.ts`. Types in `packages/sdk/src/types/page-other.ts` (standalone, not `@shared` — publishable package rule).

### DB migration (user-run)

- Posts/pages **`version`** column: `0006_posts_version.sql` (and pages equivalent if not applied). Server returns 400/409 without migration.

### Group block — Layout settings UI (design system)

- **Problem**: 2-column grid of bordered mini-cards with title + description violated `docs/design-system.md` (card-in-card, too dense).
- **Fix** (`client/.../blocks/group/group-settings.tsx`):
  - **Select** for active preset + hint line with description.
  - **`SettingsChipGroup`** for Flex vs Grid preset families (matches BlockSettings / container chips).
  - HTML tag row uses `npb-settings-chip` like container settings.
- Layout CSS still applies to **Style tab** via `updateStyles(presetToStyles(...))`; content keeps `layoutPreset` key only.

### Preview / publish icons (Google search page)

- **Problem**: Icons inside horizontal **group** rows invisible in preview — two causes:
  1. Nested children rendered via `BLOCK_COMPONENTS` → SSR `IconBlock` drew placeholder squares, not Lucide glyphs.
  2. Horizontal flex gave all children `flex: 1 1 auto` + `minWidth: 0` → icon blocks collapsed to zero width.
- **Fixes**:
  - `renderer/react/shared/lucide-glyph.tsx` — real Lucide icons by kebab-case name for publish/preview/SSR.
  - `renderer/react/advanced/index.tsx` `IconBlock` uses `LucideGlyph` + reads **color/size from `block.styles`** (SDK Google layout sets `#9aa0a6` / `22px` on styles, not `content.icon`).
  - `shared/icon-block-visuals.ts` — `effectiveIconGlyphColor`, `readIconBoxSizeFromStyles`, `getInlineFlexChildStyles` (`core/icon`, `core/button`, etc. get `flex: 0 0 auto` in horizontal group/container rows).
  - `ClientIconBlock` aligned with editor `IconBlock.tsx` visual rules; lucide sync via `LucideGlyph`, other sets lazy `IconRenderer`.
  - `renderer/react/layout/index.tsx` — GroupBlock + ContainerBlock `renderChild` use inline-flex child styles.
- **Rule**: Visual fixes for published/preview appearance → **`renderer/react/*`** (+ shared helpers). Editor canvas blocks are not the publish path (AGENTS.md).

### Vite / React duplicate (2026-07-10, partial)

- Multiple `pnpm dev` on port 5000 + mid-session Vite re-optimize can load two React copies → `Cannot read properties of null (reading 'useState')`.
- Mitigations in tree: `optimizeDeps.noDiscovery`, full `include` list, pre-warm in `server/vite.ts`, client no longer imports `tailwind.config.ts`. **Always one dev server**; hard refresh after dependency changes.

### Tests

- `shared/validate-content-save.test.ts` — icon validation, page other merge, invalid group tag.

---

## 2026-06-03 — Phase 8 Renderer Unification

Full spec: [`docs/phase8-renderer-unification.md`](docs/phase8-renderer-unification.md). Tracker: `task.md`.

### What Changed

- **`BlockData` type deleted** — renderer now uses `BlockConfig` directly (single type system)
- **`adapt-block-config.ts` deleted** (427 LOC) — 240-line `extractContentProps` switch eliminated
- **`PublicBlockRenderer` replaced** — 1001 LOC → 82 LOC thin wrapper delegating to `renderer/react/*` components
- **Post block content** — all 10 post blocks wrap content as `{ kind: "structured", data }`, zero `as unknown as BlockContent` casts in shared infrastructure
- **Token resolution unified** — `resolveTokenMapForSSR` + `collectBlockModifierCSS` moved to `shared/token-resolution.ts`
- **7 post block SSR renderers** — static placeholder components in `renderer/react/post/index.tsx`
- **Lazy loading** — `react-markdown`, `remark-gfm`, icon libraries loaded via `React.lazy()` only when blocks render
- **~1900 LOC net deleted**

### Architecture (After)

```
BlockConfig[] (single type)
    ├── SSR: renderBlocksToHtml() → renderer/react/* → HTML string
    ├── Client: PublicPageView → PublicBlockRenderer (82 LOC) → renderer/react/* → React elements
    └── (future) themeManager → same components
```

### Key Patterns

- **`createBlockDefinition`** factory: `defaultParseContent`/`defaultSerializeContent` handle structured wrapping transparently. Components work with plain objects.
- **`getRenderProps(block)`** in `renderer/react/render-helpers.tsx`: common transformation (token resolution, style merge, className, animation attrs, children recursion)
- **Content parsers**: `parseTextContent`, `parseMediaContent`, `parseStructuredContent`, `parseHtmlContent`, `parseMarkdownContent` — each component calls its own parser
- **`BLOCK_COMPONENTS`** registry in `renderer/react/block-components.tsx`: maps 36 block names (26 core + 10 post) to components
- **`CLIENT_COMPONENTS`** override in `PublicBlockRenderer`: client-specific components (e.g., `ClientIconBlock` with lazy loading)

### Files Created

| File | LOC | Purpose |
|---|---|---|
| `renderer/react/render-helpers.tsx` | 200 | `getRenderProps`, content parsers, `renderChildBlocks` |
| `shared/token-resolution.ts` | 102 | SSR token resolution + modifier CSS (shared between SSR and client) |
| `renderer/react/post/index.tsx` | 274 | 7 post block static SSR renderers |
| `client/src/components/PageBuilder/blocks/ClientIconBlock.tsx` | ~50 | Lazy-loaded icon block for client |

### Files Deleted

| File | LOC | Reason |
|---|---|---|
| `renderer/adapt-block-config.ts` | 427 | Adapter eliminated |
| `renderer/react/block-types.ts` | 288 | `BlockData` union eliminated |
| `client/src/test/adapt-block-config.test.ts` | 479 | Adapter tests eliminated |

### Deferred (not in Phase 8 scope)

- **Template system SSR wiring**: `renderTemplateBlocks()`, `buildRenderContext()` into Express routes. Functions defined in `server/templates/` but zero call sites in routes. Architecture leaves clean extension point.
- **Legacy themeManager migration**: Architecture supports future adoption of `renderer/react/*` components.

### Already Implemented (verified 2026-06-10)

- **Animation system**: Full implementation — editor UI (`AnimationPicker`), preview, SSR injection, custom IntersectionObserver entry animations (not AOS). Entry/hover/loop all working. Spec in `docs/animation-system-spec.md` is implemented (with deviations: custom IntersectionObserver instead of AOS, `data-np-entry*` instead of `data-aos*`).
- **Block library search/filter**: Implemented in `BlockLibrary.tsx` — search input, filter by label/description/category, clear button, empty state.
- **Keyboard shortcuts**: All wired in `PageBuilder.tsx` — Escape (deselect), Delete/Backspace (delete block), Ctrl+D (duplicate), Ctrl+Z (undo), Ctrl+Shift+Z/Y (redo), Ctrl+S (save). Guarded against INPUT/TEXTAREA/SELECT/contentEditable.
- **Visual drop placeholders + auto-scroll**: `DropPlaceholder` component + `placeholderIndex` propagation + rAF auto-scroll loop in `dnd/index.tsx`.
- **`post-featured-image` inline styles**: Migrated to Tailwind + `npb-*` tokens. Only data-driven inline styles remain (`aspectRatio`, `objectFit`).
- **Markdown rendering**: `react-markdown` + `remark-gfm` lazy-loaded in `MarkdownBlock.tsx`.

### Docs Cleanup

- 8 outdated docs archived to `/trash/docs-archive-20260610/` (report-1/2/4, my-notes, phase7-tasks, templates-enhancement-plan, homepage-admin-routing-task, client/plan)
- 5 root docs moved to `docs/internal/` (intent, task, COPYWRITING, documentation-guidelines); design guidance consolidated to `docs/design-system.md`
- Only `AGENTS.md` and `context.md` remain at root

---

## 2026-08-07 — Columns reconciliation diagnostics

- `shared/reconcile-columns-layout.ts` provides pure, diagnostics-only global reconciliation.
- First membership wins; stale references and duplicates are removed; direct orphans append to first column in child order.
- No load/save wiring; 35 focused column tests pass.

---

## 2026-08-10 — Accessibility pass (admin, editor, published pages)

- **Skip links**: `client/src/components/a11y/skip-link.tsx` + `.skip-link` CSS. Wired in `AdminChrome`, `PageBuilder`, and `PublicPageView`.
- **Landmarks**: Admin `main#admin-main-content`; public SPA `main#main-content` (SSR already had `#main-content`); editor canvas `#builder-canvas`.
- **Published pages**: Loading state uses `role="status"`; page-builder pages get sr-only `<h1>` via `PublicBlockStack.pageTitle`.
- **Admin lists**: Icon buttons on Pages/Posts have `aria-label`; content-list search has associated `<label>`.
- **Editor**: Device/undo/redo/sidebar toggles labeled + `aria-pressed` where relevant; block library search labeled; **Add** button per block (keyboard alternative to drag); canvas blocks focusable with Enter/Space select; title field labeled in `PageBuilderEditor`.
- **Publish renderers**: Image decorative alt handling; Media Text uses sr-only img (not `display:none`) for screen reader alt text.
- **Sidebar**: `aria-label="Admin"` on nav; section groups labeled for screen readers; section label contrast bumped slightly.

---

## 2026-08-10 — Contrast pass (admin, editor, controls)

- **`--npb-accent-foreground`**: white on light accent blue; dark text on lighter `#60a5fa` accent in dark mode.
- **`.npb-btn-accent`**: replaces scattered `bg-npb-accent text-white` on CTAs (fixes dark-mode white-on-light-blue).
- **shadcn controls**: `Button` ghost/outline, `Input`, `Textarea`, `Select`, `Toggle`, dropdown sub-triggers, toast actions — explicit `text-foreground` / `bg-background` pairs.
- **Admin lists**: `ContentStatusSelect` uses `text-npb-text-primary`; admin-page form controls inherit readable text on surfaces.
- **ResponsiveHealthBanner**: amber warning uses dark text in light theme, light text in dark theme.
- **`.npb-interactive-ghost`**: base text color set (not hover-only).

---

## 2026-08-10 — Motion + admin UX streamlining

- **Motion layer**: `client/src/lib/motion-presets.ts`, `use-prefers-reduced-motion.ts`, `components/motion/motion-primitives.tsx` (Framer Motion). Disabled in tests and when `prefers-reduced-motion`.
- **Admin pages**: `MotionPage` enter on main content; sticky page headers (`top: 8` below top bar).
- **Lists (Posts/Pages)**: search moved to page header (compact toolbar, no extra card row); sticky table headers; tighter row padding; animated `ContentListBulkBar`.
- **Dashboard**: quick-action chips (New post/page, Media, ⌘K hint); staggered stat cards; compact recent posts (no excerpt block).
- **Editor**: sidebar slide-in via `MotionSidebarPanel`; softer empty-canvas hint with motion.
- **Command palette**: Create actions listed before Navigation for fewer steps to new content.

---

## 2026-08-15 — Explicit in-canvas editing + parity fixes

- **Editing framework existed** (BlockActionsContext editingBlockId, BlockRenderer Pencil/Done/dbl-click/ring, PageBuilder Enter/Esc) but only Table + Code consumed `isEditing`; ImageBlock hardcoded `isEditing={!isPreview}` (resize handles always on).
- **New shared `InlineTextEditor`** (`blocks/shared/inline-text-editor.tsx`): input/textarea swap-in, mirrors text styles, dashed accent outline, stopPropagation wrapper. Used by heading, paragraph, quote, list, button, pullquote, preformatted — all gated on `isEditing`.
- **Esc exits editing from inputs**: PageBuilder keydown handler moves Escape BEFORE the editable-target guard (was swallowed while typing in table cell / code textarea / inline editors).
- **HTML-content blocks** (quote/list/pullquote) convert plain text ↔ HTML in inline editor using same conversion as settings panels; keep `value: html` shape so publish parity unchanged.
- **Video parity**: public `renderer/react/media` now passes `muted` to `buildYouTubeEmbedUrl`; editor `VideoBlock` refactored off hand-rolled URL builder onto shared helper (single source of truth).
- **Code copy button**: `showCopyButton` field + settings switch + copy button in editor header and public renderer (navigator.clipboard, transient "Copied").
- **Image resize handles** now appear only in real edit mode (`isEditing && !isPreview`).
- **Tradeoff**: `setContent((prev) => ({...prev, ...updates}))` breaks typecheck for `BlockContent`-extending union types (heading/text/button) — needs `as TContent` cast. Plain-object content types (quote/list/pullquote/preformatted) compile clean.
- **Pre-existing failures** (not ours): HeadingBlock/ SDK defaultStyles expect `margin: '1rem 0'` vs code `'0'`; content-list search; strip-visual columns; useDragAndDropHandler duplicate legacy IDs. Full suite 784 tests, 5 pre-existing failures.
- **Run tests with `pnpm vitest`** — npx vitest uses broken cached install (no jsdom).

## 2026-08-15 — Author box: override support + publish parity

- **Feature existed but incomplete**: editor settings already had "Use my profile" (binds authorId) and inline profile editor (name/bio/photo → PUT /api/users/:id, bio persisted via `userOtherWithBio` onto user.other). Model had content name/avatar/bio override fields, but NO UI to set them, and live profile beat override in precedence. Publish renderer overwrote custom fields entirely.
- **`mergeAuthorDisplay`** now lives in `shared/author-display.ts` (single source of truth): per-field fill — custom block fields replace matching profile details, gaps filled from live profile, then post author. `AuthorFields { name?, avatar?, bio? }` + `AuthorSource` types there too. Client model re-exports it; `bindPostBlocks` uses it for post/author-box instead of unconditional overwrite (was destroying custom fields on publish).
- **Editor precedence**: `mergeAuthorDisplay({ override, live, postAuthor })` → PLACEHOLDER_AUTHOR if fully empty. Live fetch stays enabled even with override (fills gaps).
- **Settings**: new "Custom content" card (name/bio/photo + "Clear custom content"), works for any author, independent of profile editor.
- **Public renderer** (`renderer/react/post/index.tsx`): bound-but-empty now shows "Author" placeholder instead of blank name.
- **Tradeoff**: per-field merge (not all-or-nothing) so partial custom fields coexist with profile data. Public bind path (PublicPageView → PublicBlockStack → bindPostBlocks) injects real profile at render time; SSR placeholder renderer can't fetch, relies on binding.
- Tests: `client/src/test/post-author-box.test.ts` (5, merge precedence), `shared/bind-post-blocks.test.ts` (+3 override preservation). Full suite 799, still 5 pre-existing failures.

## 2026-08-15 — Media list parity + white flash fix

- **Media.tsx migrated to shared content-list primitives** (Posts.tsx structure): `SortableHeader` (Name/Type/Size/Uploaded), `AdminListViewModeToggle` (table + grid views), `ContentListBulkBar` + `useBulkSelection` + `ConfirmBulkDeleteDialog` (contentKind extended to `media`), `ContentListToolbar` (header search), shared `ContentListPaginationFooter` (per_page 20). Grid view markup preserved (thumbnails can't be `ContentCardGrid` — title-only cards).
- **Server sort for media**: `MEDIA_LIST_SORT_FIELDS` + `DEFAULT_MEDIA_LIST_SORT` (createdAt desc) in `shared/content-list-query.ts`; `server/routes/media.routes.ts` GET now parses sort/order via `parseContentListSort` + `toModelOrderBy` (posts.routes pattern). Search stays client-side on loaded page (existing behavior; model filters AND-only, no OR across originalName+alt).
- **View-mode storage**: `AdminListResource` union extended to `'media'` (`lib/admin-list-view-mode.ts`, `use-admin-list-view-mode.ts`). Default view = table (shared hook default), grid via toggle, persisted per resource.
- **White flash fix**: `client/index.html` — inline pre-paint script applies `.dark` to `<html>` from `localStorage.npb-theme` (fallback `prefers-color-scheme`), matching ThemeProvider resolution; dark bg selector switched from `@media` to `html.dark` so index.html bg (#f3f4f6/#18181b) matches `--npb-canvas-bg` tokens exactly before React mounts. Shell (`AppLoadingShell` bg-npb-canvas-bg) already matched loaded app (AdminChrome same token).
- **Tradeoffs**: default list order changed (insertion → newest first); media default view now table (was grid-only); single delete switched from `window.confirm` to shared confirm dialog.
- **Pre-existing failures** (not ours): HeadingBlock/SDK defaultStyles, content-list search (toolbar hint copy vs test expectation), strip-visual columns, useDragAndDropHandler legacy IDs. Full suite 800, 5 pre-existing.

## 2026-08-15 — UX gap fixes round 2 (8 items, admin + editor)

User reviewed admin against 19-point list; audit found 11 already done, 8 real gaps. All 8 fixed:

- **Dashboard nesting** (bug): `<button>` inside `<Link>` at Dashboard.tsx:67-72,159-168 → `Button asChild` (Posts.tsx pattern). Dashboard.test.tsx updated to link assertions.
- **Unsaved guard** (bug): PageBuilderEditor `writeDraft` extracted (`:385-434`, reuses savePageDraftWithHistory/savePostDraft + stampDraftTimestamp); `queueDraftSave` marks `hasUnsavedServerChangesRef`; beforeunload warns only when dirty (`:454-470`); unmount flushes pending draft synchronously (last-300ms edits no longer lost). Dirty cleared on server-confirmed saves + entity switch.
- **MediaTextBlock overflow** (bug): img `maxWidth: 100%, height: auto` (MediaTextBlock.tsx:56); public renderer media-text OK (bg cover + sr-only img); parity rule `.wp-block-media-text__media img` added to shared/publish-block-css.ts:139-143.
- **Padding controls**: labels ALREADY existed (BlockSettings.tsx:374-383 sideLabel map) — audit false negative, no change.
- **Resize handles**: cursor moved to CSS (`nwse-resize`, `nesw-resize` per `data-corner`), `::after` inset -4px → 20px hit area, visual 12px. aria-label/title pre-existed.
- **Ring persistence**: idle selection now `0 0 0 1px color-mix(accent 40%)` instead of none (index.css:796-799); full double-ring stays while toolbar open.
- **Media list parity**: Media.tsx rewritten on shared content-list primitives (SortableHeader Name/Type/Size/Uploaded, AdminListViewModeToggle table+grid, ContentListToolbar search, ContentListBulkBar + useBulkSelection, ContentListPaginationFooter, shared Table). Server: `MEDIA_LIST_SORT_FIELDS` in shared/content-list-query.ts + sort/order in media.routes.ts:50-68 (posts.routes pattern). Default order changed to createdAt desc; default view now table. Single delete via shared ConfirmBulkDeleteDialog (contentKind "media") replacing window.confirm. Grid markup kept (cards not representable as ContentCardGrid).
- **White flash**: index.html inline pre-paint script applies `.dark` from localStorage.npb-theme before React (mirrors ThemeProvider); dark bg selector `html.dark` instead of media query. Root cause was stored-dark + OS-light mismatch.

### Gotchas
- frontend-engineer agent returns empty results (2 attempts) — use `general` agent for implementation on this branch.
- tsc ImageBlock error line shifted 205→206 from added `data-corner` attr (same pre-existing error).
- Full suite still 799 tests / 5 pre-existing failures; no new tsc errors.
- Backups: backup/ux-fixes-2026-08-15/.

## 2026-08-16 — Zero-failure pass: fixed all 5 pre-existing test failures

- **Heading margin (2 tests)**: SDK block-defaults.test.ts + HeadingBlock.test.tsx expected `margin: "1rem 0"`; e14776f deliberately changed heading default to `"0"` (both client + SDK registries). Tests were stale → updated to `"0"`.
- **content-list hint**: toolbar hint text changed to "Search runs across all items on this site." in 464013d (server-backed search); test still asserted old "current page only" text → updated.
- **strip-visual columns (real bug)**: `stripColumnsContent` used `writeColumnsData` which re-merges original data (`{...current, ...updates}`) → deleted `gap`/`direction` got restored. Rewrote to raw structured-data delete (mirrors stripStructuredDataKeys). Save + publish paths now actually strip columns visual keys.
- **useDragAndDropHandler (real bug)**: same-columns-block cross-column drops hit `moveExistingBlock`'s `destIndex === sourceIndex + 1` no-op (plain-container heuristic) → false "Failed to move block" toast, no move. Fix: when source+dest are columns of the SAME columns block, skip moveExistingBlock — membership-only move (children array is shared storage; each column renders from its own blockIds in columnLayout). `moved === blocks` failure check only runs for non-columns reorder path.
- **Result: 799/799 tests pass, 116/116 files. Zero failures.** tsc: only pre-existing errors (verified useDragAndDropHandler 252/271 exist at same lines in HEAD).

## 2026-08-16 — Zero-tsc pass: eliminated all 145 pre-existing tsc errors

Strategy: extend types to match real runtime shapes rather than cast at every call site; where the consumer is a narrow test mock, cast the mock.

Key type fixes (shared/schema-types.ts BlockContent):
- Added optional `overlayColor`, `poster`, `autoplay`, `loop`, `muted`, `controls`, `minHeight`, `width`, `height` to the `media` member — block code reads `content.overlayColor`/`content.autoplay` (CoverBlock, media renderer, AudioBlock).
- Added `citation?` to `text` member (pullquote/quote blocks read `content.citation`).
- Added a `list` member (`ordered?`, `values?`, `items?`, `start?`, `reversed?`, `anchor?`, `className?`) — ListBlock renders from these; demo fixtures lacked `kind: "list"`, added it.

Union/return-type cast fixes (pattern: `x as unknown as T` when TS can't prove overlap):
- `resolve-token-entry.ts`, `tailwind-scales.ts`, `lucide-glyph.tsx`, `page-other.ts`, `columns-model.ts` serialize.
- `useBlockState.ts` `setStyles` narrowed to `(next: CSSProperties | undefined) => void`; ImageBlockView adapted `handleStylesChange` to merge from `styles` prop instead of functional update.

RHF `field.value` (string | null | undefined) → `value={field.value ?? ""}` at spread sites in Register.tsx + Users.tsx; Select `defaultValue={field.value ?? ""}`.

better-auth: `authClient.signUp.email` does not accept `firstName`/`lastName` → removed from Register call.

`isPreviewableContentStatus` param widened to `string | null | undefined` (preview.routes passed `post.status`).

Framer-motion: `Transition['ease']` indexing fails on the public union → typed `MOTION_EASE_OUT` as imported `Easing`.

`tsconfig.json`: added `"target": "ES2022"` (default ES5 triggered TS2802/1378); stale tsbuildinfo cache required `--incremental false` to observe — cleared via moving tsbuildinfo files to backup/trash.

Test mocks (cast at call site, no `any`):
- `delete-page.test.ts`, `content-list-access.test.ts`: partial deps/hooks mocks cast `as unknown as Deps[...]`.
- `BlockRenderer.test.tsx`: `mockActions` cast to `BlockActionsContextValue`.
- `AdminSidebar.test.tsx`: mock `<a>`, `aria-current` typed to the ARIA literal union.
- `client-post-blocks.tsx`: `load` param `Promise<{default: unknown}>`; lazy factory return explicitly typed.
- `map-wp-page.test.ts`: result cast to access `blocks`/`other`.
- `columnsBlock.test.ts`: removed duplicate local `ColumnLayout` interface, imported shared.
- `useContentLists.test.tsx`: removed explicit `Post[]`/`Template[]`/`Theme[]` annotations (drizzle-loose `blocks: never[]`).
- Demo fixtures: added `kind: "list"` (blog-article, cafe-local) and `kind: "text"` (portfolio-studio).

**Result: `pnpm exec tsc --noEmit` 0 errors, `pnpm check` (tsconfig.server.json) 0 errors. Tests 799/799.**
