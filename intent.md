# Intent — Data Export/Import + npm CLI removal

Date: 2026-08-27
Status: APPROVED by owner (decisions made in discussion, recorded here)

## What

1. Add data export/import to the shipped bash CLI (`scripts/nextpress`):
   - `nextpress export [--users] [--posts] ... [--site <slug>] [--with-media-files] [--out <file>]`
   - `nextpress import <file> [--users] [--posts] ... [--mode overwrite|skip]`
2. Build the export/import **engine in the server codebase** (`server/transfer/`) so the future dashboard UI reuses the same logic.
3. **Remove `packages/cli` (npm package `@nextpress-org/cli`) completely** — it is legacy, superseded by the bash CLI, and causes confusion.

## Why

- Users need to move/backup their data (users, posts, pages, etc.) between installs.
- CLI first; dashboard settings UI later (JSON only there).
- npm CLI package is dead weight: no DB/HTTP capability, duplicated command set.

## How (agreed decisions)

- **Engine placement**: `server/transfer/` domain module in the server codebase. Exposed via:
  - v1: in-container runner `dist/transfer-cli.js` (new tsup entry, follows `server/seed-default-content.ts` precedent). Bash CLI invokes `docker compose exec -T app node dist/transfer-cli.js ...`, streaming JSON/tar.gz over stdout (export) and reading stdin (import).
  - v2 (later, not this task): `/api/transfer` routes + dashboard settings UI, JSON only.
- **Format**: single JSON document `{ manifest, data }`. `manifest`: format name, formatVersion 1, app version, timestamp, site scope, entity counts, includesMediaFiles. `data`: one key per entity table.
  - With `--with-media-files`: `.tar.gz` containing `export.json` + `media/<filename>` binaries from `uploads/`. Packed/unpacked with **system `tar`** inside the container (node:24-alpine busybox tar) — no new npm deps.
- **Entities**: `users` (users table incl. password hashes — required for migration; file is sensitive like a DB backup), `sites` (sites + roles + userRoles), `pages`, `blogs`, `posts`, `comments`, `media` (rows; files only with flag), `templates`, `options`.
  - Excluded: sessions, authSessions/accounts/verifications (recreated on login; OAuth relogin is a known v1 limitation), apiKeys (security), previewTokens (ephemeral).
  - No entity flags = export/import everything.
- **Conflicts**: upsert by UUID. Default `overwrite` (re-import refreshes); `--mode skip` never touches existing rows. Per-entity created/updated/skipped counts reported.
- **Import order** (FK deps): users → sites → roles → userRoles → templates → pages (parents before children) → blogs → posts → comments (parents first) → media → options. Self-referencing tables (pages.parentId, comments.parentId) topologically ordered within the export set.
- **Site scoping**: `--site <slug>` filters site-owned data; users = site members + content authors; templates = those referenced by exported content. Default = all sites.
- **Partial export caveat**: selective entity exports assume dependencies exist on target (e.g. `--posts` without its site). Per-row errors are logged, import continues. Full exports are always consistent.
- **npm CLI removal**: `packages/cli/` → `trash/`, remove root `cli:*` scripts, README/docs/installer reference sweep. `pnpm install` lockfile regen needed after (owner to run / approve).

## Impact / blast radius

- `server/transfer/` new module + tests; `tsup.config.ts` +1 entry. No existing server behavior changes.
- `scripts/nextpress` (SHIPPED installer CLI): new `run_export`/`run_import`, case branches, help text. Backed up before edit.
- `package.json`, `README.md`, `docs/cli-usage.md`, possible refs in `install.sh`, `docs/`, `.github/`, `scripts/` for npm CLI removal.
- Docker image: runner ships in `dist/` automatically via existing build. `uploads/` already at `/app/uploads` in container.
- Lockfile must be regenerated (`pnpm install`) or Docker `--frozen-lockfile` builds break.

## Verification

- Vitest unit tests for engine (self-contained, own fixtures): manifest round-trip, overwrite/skip modes, FK ordering, site scoping, tar bundle round-trip, partial entity selection.
- `pnpm check` typecheck passes.
- Bash CLI: owner tests on a real/dev install (agents may not start servers).
- qa-engineer reviews all diffs for conventions + dangling npm-CLI references.
