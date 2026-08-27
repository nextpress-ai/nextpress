# Nextpress — Project Context

> Curated project-wide knowledge for agents. Read this first before exploring.
> Owner: Solutions Architect. Last updated: 2026-08-27.

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
