# Nextpress — Project Context

> Curated project-wide knowledge for agents. Read this first before exploring.
> Owner: Solutions Architect. Last updated: 2026-09-20.

## What this is

Nextpress: self-hostable WordPress-compatible CMS. TypeScript monorepo (pnpm workspaces).
Dev DB = PGlite (embedded postgres, `data/pglite`). Prod = Postgres in Docker.

## Repo map

- `server/` — Express + Hono API, entry `server/index.ts`. Routes in `server/routes/*.routes.ts`, mounted in `server/routes/index.ts` under `/api/*`.
- `client/` — React 19 dashboard (wouter, react-query, shadcn/radix, tailwind). Pages in `client/src/pages/`.
- `shared/` — Drizzle schema (`shared/schema.ts`), shared logic (`shared/import/wordpress/`), base model factory (`shared/create-models.ts`).
- `packages/sdk` — `@nextpress-org/sdk`, TS client covering users/media/posts/pages/etc.
- `packages/mcp` — MCP server over the SDK.
- `scripts/nextpress` — **the real shipped CLI** (bash, installed to `/usr/local/bin` by `install.sh`). Has DB access via `compose exec -T postgres psql/pg_dump`, app health via `compose exec app node -e fetch(...)`.

## Key architecture facts

- **One CLI.** The bash `scripts/nextpress` is the shipped command (install/upgrade/status/logs/restart/reload/uninstall/version/help). The legacy npm package `@nextpress-org/cli` was removed 2026-08-27.
- **Auth**: `requireAuth` = better-auth session cookie OR Bearer API key (`npk_live_…`). `requireSessionAuth` = cookie only. Scope enforcement in `server/middleware/api-key-scope-enforcer.ts` using `shared/api-key-scopes.ts` SCOPE_RULES. **Unmapped `/api/*` routes fail closed (require ALL scopes)** — new routes must add a scope rule.
- **Multi-site**: most content tables are `siteId`-scoped. `users`, `templates`, `themes`, `plugins`, `sessions` are global. Categories/tags live inside `posts.other` jsonb, not separate tables.
- **Media is binary on disk** in `uploads/` (multer diskStorage, served at `/uploads`), `media` table holds metadata + relative `url`. Export/import handles files separately from DB rows.
- **Transfer module** (`server/transfer/` + `server/transfer-cli.ts` → `dist/transfer-cli.js`): data export/import engine. Factories `createTransferExporter`/`createTransferImporter` (DI over models — reusable by future `/api/transfer` routes). Format: JSON `{manifest, data}`; `.tar.gz` with `media/` binaries when `--with-media-files`. Upsert by UUID, modes overwrite (default)/skip. FK import order: users→sites→roles→userRoles→templates→pages→blogs→posts→comments→media→options; parent chains topo-sorted. `--site` matches site NAME or hostname (sites table has no slug column). Bash CLI `nextpress export|import` runs it via `compose exec -T app node dist/transfer-cli.js`, payload over stdout/stdin. `server/db.ts` logs go to **stderr** — stdout is payload-only, keep it that way. Runner must `await pool.end()` before exit (pg-pool holds sockets ~10s otherwise).
- **`sites` entity bundles 3 tables**: `data.sites = { sites, roles, userRoles }` (type `SiteEntityData`). Import writes them in FK order under one "sites" summary entry — by design, NOT a bug. `ExportData.sites` is `SiteEntityData`, not an array.
- **Schema requirement (export/import needs current schema)**: the engine reads columns added in migrations `0006_posts_version.sql` (`posts.version`), `0007_posts_menu_order.sql` (`posts.menu_order`), `0006_api_keys_site_required.sql` (`api_keys.site_id`), and `0002_better_auth_and_multi_site.sql` (`users.name`, `users.email_verified`, `users.display_username`); `options.site_id`/`media.site_id` added in `0006`/`0008`. On an install whose DB predates these, export fails with `column "X" does not exist`. Fix = run `nextpress upgrade` (applies pending migrations). A drifted DB with a broken drizzle journal can't be auto-migrated — needs manual idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (see 2026-08-27 verification note).
- **WP import** (`server/routes/import.wordpress.routes.ts` + `shared/import/wordpress/`): dedup via `other.import = {source, domain, wpId}` map (`build-imported-wp-map.ts`); re-import updates instead of duplicates; `sideloadRemoteImage` (`server/utils/sideload-remote-image.ts`) writes remote images to `uploads/` + creates media rows. Rate limit 5/min, batch max 50.
- **DB backup** (distinct from transfer export): bash CLI `create_db_backup()` (pg_dump to `$INSTALL_DIR/backups/`) used pre-upgrade only.
- Base model (`shared/create-models.ts`): `findMany`, `findManyWhere`, `findById`, `count`, `create`, `update`, `delete`.

## Data model (main tables)

sites(root), users(global), roles+userRoles(site), pages(site, unique siteId+slug), posts(via blogId, other.categories/tags), blogs(site), comments(via post), media(site), templates(global), themes, plugins, options(site, unique siteId+name), apiKeys(site), sessions, authSessions/accounts/verifications(better-auth), previewTokens(site).
UUID PKs everywhere except sessions.sid.

## Conventions

- See `AGENTS.md` (source of truth): factories not classes, `safeTry`, named params `{ name, email }`, plain words over jargon, domain folders with barrel `index.ts`, no cross-domain barrel re-exports.
- UI work: read `docs/internal/design-system-v2.md` first (if present).
- Boundaries: never start servers, no DB commands, no git, no `.env` — ask owner. Backups to `/backup` before >10-line changes; deletes go to `/trash`.

## Decision records

### 2026-09-20 — Block settings: preset + Custom everywhere, and closed until clicked
- **One control for sizes and looks:** `DimensionPresetField` = preset chips, a trailing Custom chip, one input. A saved value that matches no preset opens Custom by itself. Fields with no Auto/None chip get a Reset. `kind` says how the box tidies input: `length` (bare `18` becomes `18px`), `number`, or `text` (aspect ratio, font weight). Use it instead of a chip group plus a loose input.
- The Custom box keeps a local draft while typing. Some owners (the header) swap an empty value for a default; without the draft the box refills mid-edit.
- **Clearing a style:** `updateStyles({ key: undefined })` now really clears. The in-memory path drops the key; the tree path sends `null` because `deepMerge` skips `undefined`. Before this, "None" on Max width was a silent no-op on the tree path.
- **Cards:** one primary card open per block, the rest closed until clicked. A card opens by itself when it already holds saved values (`style-set.ts`, `anyStyleSet` / `anyTokenSet`). `BlockSettings` is not remounted when you pick another block, so its tab panels are keyed by block id — that is what re-runs the open/closed rule. Per-block Content tabs: the first card stays open and "Settings"-type cards close. Deliberate exceptions: Heading and Post Title keep the level picker open (whole panel is two small cards).
- **Colors:** `TokenColorPicker` is one row (swatch, name, chevron); the palette opens on click. Pass `collapsible={false}` where a popover already provides the trigger (`theme-color-row.tsx`). Hover colors sit in a closed "Hover colors" group. Weight and line height sit in a closed "Weight & line height" group. Both open by themselves when set.
- **Spacing:** moved to `spacing-styles.ts` + `SpacingSidesField`. Padding and margin both use presets + Custom, with "Edit sides separately". Fixed a bug: editing one side under a shorthand (`padding: 1rem 2rem`) used to delete the other three sides; they are now kept.
- **Header:** logo size, logo corners, button size, button corners all take Custom. Button `size` is a preset name (`sm`-`xl`) or a CSS length. A custom length sets the font size; height and padding follow in `em` (`headerActionSizeLook`). Unfinished typing stays saved but paints as MD, so the box never fights the person. Buttons' Look/Size/Corners/Color live in a closed "Button style" row; Links and Buttons cards start closed.
- **Measured** (live builder, heading Style tab): 3,296px before; an untouched text block is about 1,100px now (Typography 513 + five closed cards at 68 + 247 chrome). Colors alone went 1,314px to 301px.
- Chip grid is 2-4 columns by label length (was always 2); chip height 36px; closed card header 68px; gap between Style cards 12px.
- **Testing gotchas:** a Brave window that is behind others reports `visibilityState: hidden`, and screenshots then hang. A same-origin full-size iframe inside that tab still lays out, so heights can be measured by JS. CSS transitions do not run in a hidden tab, so cards toggled by hand report stale heights — measure cards that render closed from the start.
- **Sidebar anatomy (same day, second pass):** the settings area was five stacked bordered surfaces with a repeated "Block settings" title, a hero card, a boxed panel, a shaded card header, and three label styles. Now: one plane, hairline dividers. Sticky selection header = block icon + name + text tabs (`BlockSettings`). Sections are flat rows (`CollapsibleCard`, restyled in `index.css`); sub-groups use `SettingsDisclosure`; a one-group block uses `SettingsSection` (page shell, HTML, text, post comments, author box) — no accordion. `.npb-settings-hero` / `.npb-settings-panel` are deleted; `.npb-settings-well` is only for small inset tiles. All field labels are `text-sm` medium `text-secondary`; field-label icons are gone. Nested accordions became disclosures (animations, "Size & advanced"). Page shell width and padding now take presets + Custom (`PAGE_PADDING_PRESETS`). Full rules in `docs/design-system.md` §16.
- Sidebar CSS gotcha: many block settings files stack cards inside `space-y-4`; `.npb-editor-sidebar .npb-settings-collapsible-card { margin-top: 0 !important }` cancels those gaps so the hairlines stay continuous. If you remove that rule, sections get 16px gaps again. The bottom scroll-fade colors must match the rail surface (`surface-base`); they were tuned for the old raised box.
- Not verified live for the anatomy pass: the :5000 dev server was down and the Brave window was hidden. Covered by jsdom tests (`BlockSettingsAnatomy.test.tsx`) and a CSS parse check only. Look at it in the browser before shipping.
- Haiku did the per-block card pass (31 files, only `defaultOpen` lines); reviewed against `backup/2026-09-20-block-settings/` by diff. Backups of every touched file live there.

### 2026-09-20 — Header: "Blocks" layout, and no menu button without links
- **New layout `brand-and-blocks` ("Blocks"):** brand on the left, and the right side is a drop area for any child blocks (buttons, icon, text, image…). The header is now a container (`isContainer` + `handlesOwnChildren`, like Group / Page shell). Children live in `block.children` and are only painted in this layout; switching away hides them without deleting them.
- **`type: "container"`:** `BlockConfig` says only containers hold children. New headers get it from the registry. Existing headers (`type: "block"`) are flipped when the person picks the Blocks layout (`pickLayout` in `header-settings.tsx`) — the flip must come AFTER the content write, because `useBlockState.setContent` re-sends the whole block (stale `type` included) and the last write wins. The SDK header definition is a container too.
- **No menu button without links:** `headerCollapsesToMenu(variant)` = the layout has nav. Buttons and Blocks layouts render no mobile panel/burger at all and carry `is-no-menu`; CSS keeps their right side in view at narrow widths and lets it wrap under the brand (`publish-block-css.ts`). Layouts with links still fold into the menu below a 767px header width.
- One drop-area shape everywhere: `HeaderBar` takes a `blocks` node. Editor passes `ContainerChildren` (row styles from `HEADER_BLOCKS_ROW_STYLES`, min width 14rem while empty so there is something to aim at); preview/publish/SSR pass rendered children from `renderer/react/layout/header.tsx` with the same per-child wrapper the Stack uses.
- Settings show only what the layout paints: Links card only if the layout has links, Buttons card only if it has built-in buttons. The Blocks layout adds one hint line ("Drop any block on the header's right side, on the canvas.").
- **Editor drafts are local and automatic.** `PageBuilderEditor` writes the page to `localStorage` on every change (key `page-builder:page:<id>`) and restores it on load when newer than the server copy. Testing in a shared browser profile therefore edits the person's real draft even though nothing was Saved. Do not drive the live builder with edits on someone's page; use jsdom tests, or snapshot and restore the draft. (This bit us: a test left a wide logo on a 20px circle crop, and a test button on a custom size. Restored by hand.)
- Test gotcha: `renderer/react` header/page-shell/block table import each other; import `render-helpers` first in tests or `BLOCK_COMPONENTS['core/header']` reads `undefined`.

### 2026-09-20 — One group for every custom value, one control for colour, and button parity with the header
- **`[ Custom | value | unit ▾ ]`** is the only way to enter a custom length: `UnitValueField` (pure parsing in `shared/unit-value.ts`), used by `DimensionPresetField` (chips above), the spacing sides, and standalone fields. Values it cannot split (`calc()`, `2rem 1rem`) are shown as saved and never rewritten; typing keeps a local draft and never saves a half-typed unit (`24p`); the last unit is remembered when the number is cleared. The old separate "Custom" chip, `normalizeCustomValue`, `NumericWithUnitField` (in `trash/`) and container's private `UnitToggle` are gone.
- Not converted on purpose: values stored/used as bare JS numbers (spacer height, divider/media width %, cover min height and dim ratio, post-progress height, list start, textarea rows, page settings numbers). Converting them needs a data-shape decision, not a UI swap.
- **`ColorField`** replaces four separate pickers: a Background / Text toggle, quick swatches, a `[ Custom | value ]` group (no unit dropdown), full palette under "All colors", optional Clear. `TokenColorPicker` is now its single-target wrapper. Page shell and the Style tab's Colors card use the two-target form (text blocks open on Text, everything else on Background).
- **Removing a colour token:** the tree update path deep-merges, so a key missing from the patch is not deleted. Removed tokens are saved as `null`; both token resolvers (`shared/token-resolution.ts`, `client/src/lib/tailwind-tokens.ts`) skip nulls. `purgeTokenMapKeys` in `BlockSettings` had been silently doing nothing on the tree path; it now writes nulls.
- **Button block parity with the header's buttons:** `shared/button-look.ts` + `ButtonLookCard` (Style tab, first, open): Look (Solid / Ghost), Size (SM–XL, or a custom text size with padding in `em`), Corners, Color. Saved as ordinary styles + colour tokens, so publish is unchanged. LG equals the size every new button already has (16px, `12px 24px`), so no existing button changed. Switching look moves the colour between the background and the text and removes the token that would otherwise win. Typography folds away for buttons.
- Haiku did the mechanical length swaps (9 files); review found and fixed real regressions before commit: icon settings lost its 24px / 2px defaults for older icons and added a redundant draft layer; container settings kept a second unit control under the new dropdown. Always diff-review, and prefer replacing a file's hand-rolled preset/unit machinery with the shared field over patching around it.

### 2026-09-21 — Two-target colour everywhere, "Float on scroll" really floats, and a compile-check gap
- **Every colour control is two-target now:** Button look card, header buttons, container, icon (`Icon` / `Background`), page shell and the Style tab. Header buttons gained an optional `textColor` (solid keeps white text without it; a ghost's first target is labelled "Outline"). The old "Theme" reset is `ColorField`'s Clear. `TokenColorPicker` stays only for single colours.
- **Theme button on every colour control** (`ColorField` `onTheme`, replaces the short-lived "Clear"): lit while the colour follows the page theme; one click hands it back. Where "unset" already means theme (header buttons, container, icon, page shell, Style tab) it clears the token/style; the button block stores the theme as a value (`THEME_BUTTON_FILL` / `THEME_BUTTON_TEXT` in `shared/button-look.ts`, from `--npb-accent` / `--npb-accent-foreground`, old blue as fallback) and passes `followsTheme` because unset there would be plain text. Removed tokens are written as `null` (see the null-token note above).
- **Float on scroll (was "Stay on scroll"):** the `<header>` itself can never stick — sticky only moves inside its parent's box and the header sits in wrappers exactly its height (measured: scrolled 400px, header top -400). The OUTERMOST wrapper must be sticky. `headerFloatWrapperStyles` (`shared/header-model.ts`) is applied wherever a container wraps its children: editor `ContainerChildren`, and the published page shell, group and stack. Data key is still `sticky`; CSS class still `is-sticky`. If a new container renderer is added, apply the helper to its child wrapper or floating silently breaks there.
- **`pnpm check` only type-checks the SERVER** (`tsconfig.server.json`). It never looked at client code, so "typecheck clean" meant nothing for the builder. Check the client with `pnpm exec tsc --noEmit -p .`. Baseline today is 14 errors, none from this work: `BlockRenderer` (chrome style types), `CoverBlock`, `TableBlock`, `useSettingsState` (implicit any), theme editor panels, `ButtonsBlock` / `FileBlock` (missing `BlockContent` import), `resolve-tailwind-color-token`, two tests, two in `server/initialize-default-templates.ts`. Suggest adding a `check:client` script.
- **What that blind spot let through:** a Haiku import swap removed `SettingsLabel` from `PreformattedBlock` (still used three times → the panel would crash), and my own import-pruning script dropped `Link as LinkIcon` from the icon panel (aliased imports do not match a plain name search). Tests did not render those panels. After any import cleanup, run the full client compile, not just the tests.

### 2026-09-12 — Page design lives on the page shell
- Every page has one root **Page shell**. Font, width, padding, background, and text color are set there — not in Page Settings.
- Page Settings is title, slug, SEO, and icons only. The Design tab is gone. Do not write those values back to `page.other.design`.
- Old pages wrap on editor open: existing root blocks become shell children, and leftover `page.other.design` is copied onto the shell once so the published look does not jump. After that, only the shell is read.
- Header is a structured block (brand / links / buttons). It paints edge to edge inside the shell. Sticky follows the canvas scroll, not the browser window.
- Open header menu is in-flow (pushes the next blocks). In an overlay stack the header wrapper stays at z-index 40 so the menu does not mix with later siblings. Settings use stacked label-above-field rows, path placeholders (`/about`), and a quiet-then-solid button pair. Wordmark is name only. Logo has size, corners, and optional name. Each header button has look (ghost/solid), size, corners, and optional color (Theme resets to the page accent).
- Visitor, preview, and publish always render through a shell. There is no no-shell visitor path.

### 2026-09-12 — Canvas chrome hugs content
- Editor selection box defaults to hug (`fit-content`) for text and media. Header and layout blocks (`core/header`, `core/page-shell`, stack, group, container, columns) start in span (full slot). Toolbar still toggles. Session only — not saved, not published.
- Blue outline and toolbar only when the block is selected. Hover on an unselected block does nothing.
- Do not reuse Style Width / Hug / Fill for this. Those write published `styles.width`.

### 2026-09-10 — Post list overlay + public post grid
- Post List default is a responsive grid; details open in an overlay (`openIn: overlay`). Full page is still an option.
- Published lists bind real posts (SSR + public JSON `GET /api/public/posts`). Overlay fetches `/api/public/post/:slug` including `renderedHtml`.
- SDK: `public.posts()`. MCP: `list_blogs`, `get_blog`, `create_blog`, `publish_post`, `preview_post`.
- Showcase seed: `packages/sdk/scripts/build-showcase-site.ts` (needs integration.config.ts). Does not start the server.
- Visitor polish (2026-09-10): SPA Post List must not put `--grid` on both wrapper and items — nested 3-col grids squeezed cards to ~142px. Cover needs `display:flex` so inner copy fills `minHeight` (percent height does not resolve against min-height). Overlay portals to `document.body` under `html.dark`, so it must set its own `--npb-text-primary` ink or post HTML renders white on white.


- One Style-tab **Layout** card (`AutoLayoutPanel`) for Group, Container, and Columns. Direction, wrap, 9-point align, Packed/Between/Around/Evenly, gap presets, Hug/Fill/Fixed, overflow. Same `styles` keys as the old CSS chips — no schema change.
- Group Content tab is starters only (Vertical / Horizontal / Grid 2 / Grid 3) plus HTML tag. Fine-tune lives on Style.
- New Group and Container inserts default to flex column + `gap: 1rem`. Saved `display: block` Groups are not rewritten on read.
- Row children: unset width and `100%` still Fill (`flex-grow: 1`) so old rows do not collapse. Hug is grow 0 + `fit-content`. Fixed is `flex-basis` of the length. Shared helper `getHorizontalFlexChildStyles` in editor, public SPA, and SSR.
- Child “Pin in parent” only when the parent is flex/grid. Copy is Left / Center / Right, not CSS property names.
- Editor drop targets use outline, not border + extra padding, so editor gap matches publish.
- Tests: `pnpm test layout` (Vitest harness, no FakePageBuilder, no Storybook). Owner-run `pnpm audit:demo-pages` now also records inner-stack display / flex-direction / gap; agents do not start servers.

### 2026-08-27 — Export/import feature SHIPPED (CLI) + npm CLI removed
- Built: `nextpress export [--users] [--sites] [--pages] [--blogs] [--posts] [--comments] [--media] [--templates] [--options] [--site <name>] [--with-media-files] [--out f] [--force]` and `nextpress import <file> [--entities...] [--mode overwrite|skip]`. No entity flags = all.
- Architecture: one engine in server codebase (`server/transfer/`), in-container runner (`dist/transfer-cli.js`) invoked by bash CLI via `compose exec`. Chosen over API-key HTTP for CLI (docker access already implies full trust) and over bash-side SQL (logic stays in TS, reusable).
- `packages/cli` (legacy npm `@nextpress-org/cli`) REMOVED → `trash/packages-cli-2026-08-27/`. pnpm-workspace glob needed no edit; lockfile already regenerated during session.
- Users export includes password hashes (approved — export file is sensitive like a DB backup). Sessions/apiKeys/authSessions/accounts/verifications/previewTokens excluded. OAuth users must relogin after migration (known v1 limit).
- `--site` = site name or hostname (no slug column exists).
- Phase 2 (not built): `/api/transfer` routes (JSON only, needs scope rule in `shared/api-key-scopes.ts`) + dashboard settings UI mirroring `components/import/*`. Engine is DI-ready for this.
- **Lessons (QA round)**: parallel builds fail at seams — QA caught 5: (1) module-scope `console.log` in db.ts corrupted piped exports → logs must be stderr in any CLI-entry chain; (2/3) bash `(cd dir && cmd < "$f")` resolves relative paths after cd → absolutize before subshell; (4) `process.exit` after `stdout.write` truncates large payloads → await write, use exitCode; (5) `> file` truncates before command runs → temp file + mv. Then pool-drain hang after removing process.exit → always close pg pool in CLI runners.
- Pre-existing (NOT this change, still open): `pnpm check` errors in `server/routes/render.routes.ts` (5), `server/lib/send-published-html.ts` (1), `shared/theme-settings.ts` (2). PGlite WASM teardown noise in vitest output is pre-existing.

### 2026-08-27 — Export/import VERIFIED on real installs (smoke test)
- Canonical install = `/opt/nextpress` (docker-compose.prod.yml, image `husseinkizz/nextpress:latest`, caddy 80/443). A stray stack `nextpress-cli-clean-install-*` (composed from `/tmp/nextpress-cli-clean-install/`) holds the owner's REAL data but is schema-drifted (4-month-old DB, broken drizzle journal).
- Verified end-to-end on BOTH: (1) `/opt` bash CLI — export JSON, export `--with-media-files` (valid gzip tar.gz), import JSON (create + skip + overwrite), import tar.gz, `--site` no-match graceful error. (2) `/tmp` real-data — export 1 user + 3 roles, import round-trip (skip/overwrite). 15/15 unit tests pass (PGlite in-memory); `pnpm check` clean.
- To test on a real install: copy local `dist/transfer-cli.js` into the app container at `/app/dist/transfer-cli.js` (self-contained; running app uses `index.js`, unaffected), ensure migrations applied, then run `bash scripts/nextpress export|import`.
- **Schema drift on `/tmp` stack**: missing columns `posts.version`, `posts.menu_order`, `options.site_id`, `media.site_id`, `users.name`, `users.email_verified`, `users.display_username`. drizzle-kit `migrate` failed (`CREATE TABLE "blogs"` — journal mismatch). Reconciled manually with idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (varchar / boolean DEFAULT false NOT NULL as per migrations). After that, export/import ran clean. Owner should run `nextpress upgrade` on a healthy journal for a permanent fix.
- **Uncommitted improvement**: `server/transfer-cli.ts` top-level `.catch` now also logs the failing SQL (`[transfer] Failing query: ...`) on error — better diagnostics, complies with AGENTS.md log-resolving-context rule. Built into local `dist/transfer-cli.js`; not yet committed.

### 2026-08-27 — Installer/CLI now resolve from nextpress-ai/nextpress (repo ownership)
- Root cause: `scripts/nextpress` + `install.sh` (and `deploy.sh` release link, `shared/release/fetch-latest-version.ts` version check, `config.ts` UI links, docs) pointed at the stale fork `pabloh3/nextpress1`. So a fresh `curl …/install.sh | bash` and every `nextpress upgrade` self-update pulled the OLD CLI (v1.0.11, no export/import/reset) and the old compose.
- Fix (commit `3d0263f`): replaced `pabloh3/nextpress1` → `nextpress-ai/nextpress` in all live files. Raw URLs verified to resolve on `nextpress-ai/nextpress/main`. `docker-compose.prod.yml` already references `husseinkizz/nextpress:${NEXTPRESS_VERSION:-latest}`, so the compose fetch is safe.
- **Prod action required (one-time)**: the already-installed prod CLI still self-updates from pabloh3. Until replaced, `nextpress upgrade` re-fetches the stale CLI. Fix = re-run `curl -fsSL https://raw.githubusercontent.com/nextpress-ai/nextpress/main/install.sh | sudo bash` (overwrites /usr/local/bin/nextpress with 1.3.6) OR copy `scripts/nextpress` to /usr/local/bin/nextpress. After that one replacement, self-update keeps it on nextpress-ai and `nextpress upgrade` pulls the fixed image (beta-v1.3.6) + applies migration 0002 backfill.
- Note: `try_self_update_for_upgrade` (scripts/nextpress) re-execs the freshly downloaded CLI, so the FIRST upgrade after replacement also refreshes compose from nextpress-ai.

## Operator scripts gate

Per AGENTS.md: never commit new/changed operator scripts (`scripts/*` money-touching) without audit + unit tests + dry-run.

## Hidden-tab flex bug (2026-09-12)

- Symptom: builder sidebar (tabbed shell, <1280px) scroll area clipped at ~half height; block library unreachable below the fold.
- Root cause: `BuilderSidebar` puts `flex` (display) on `TabsContent`. Radix keeps inactive tab content mounted with the `hidden` attribute, whose UA `display:none` is ALWAYS beaten by author display classes — so the hidden Settings tab split the column 50/50 with the active Blocks tab. Pure CSS chain (flex/min-h-0/h-full) was provably sound; the bug only shows in the Radix DOM.
- Fix: `data-[state=inactive]:hidden` added to the base `TabsContent` in `ui/tabs.tsx` — author display classes can no longer resurrect hidden tabs anywhere in the app (specificity: `[data-state=inactive][class]` beats `.flex`). Verified live at 1222×659: tab content 205→434px, viewport scrollable (4606px content), wide rail unaffected.
- Gotcha for future UI: never rely on the `hidden` attribute alone when adding `display:*` classes to Radix primitives that keep content mounted (Tabs Content, Accordion Content with forceMount, Dialog non-modal siblings).
- Debug workflow that cracked it: agent-browser `set viewport 1222 659` → live `getBoundingClientRect` walk of the chain → compare both `TabsContent` computed displays. Dev server was on :5000 (SPA fallback returns HTML 200 for unknown /api paths — check response BODY content-type when probing, status alone lies).
