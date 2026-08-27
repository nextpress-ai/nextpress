# Task — Export/Import CLI + npm CLI removal

Date: 2026-08-27. Spec: see `intent.md` (approved).

## Phase 1 — parallel build

- [x] 1a. Engine: `server/transfer/` (types, manifest, export, import, tar bundle, runner entry) + vitest tests → backend-engineer
- [x] 1b. Bash CLI wiring: `scripts/nextpress` run_export/run_import + help + `docs/cli-usage.md` → backend-engineer
- [x] 1c. Remove `packages/cli` + sweep all references → backend-engineer

## Phase 2 — verify

- [x] qa-engineer: review diffs, run vitest + `pnpm check`, dangling-ref sweep → found 5 seam bugs + 4 lows
- [x] Fix findings → all fixed; pool tail-hang found in re-verify also fixed. Final: 859/859 tests, dist clean, QA SHIP criteria met

## Phase 3 — owner steps

- [x] ~~Owner runs `pnpm install`~~ — lockfile already regenerated during session (verified zero cli refs)
- [x] Owner smoke-tests `nextpress export` / `nextpress import` on a real install — DONE 2026-08-27 (architect ran it with owner permission; see context.md verification note). Verified: /opt bash CLI export(JSON+tar.gz), import(JSON create/skip/overwrite + tar.gz), --site no-match error; /tmp real-data export+round-trip. All green.
- [x] Update context.md decision record; mark task complete

## Smoke-test findings (2026-08-27)

- Feature works on real Postgres (not just PGlite unit tests). Canonical `/opt/nextpress` + stray `/tmp` stack both exercised.
- **Schema drift blocker on old installs**: export fails `column "X" does not exist` if migrations 0006–0008 not applied. `/tmp` stack had broken drizzle journal → manual idempotent ALTERs applied (posts.version, posts.menu_order, options.site_id, media.site_id, users.name/email_verified/display_username). Permanent fix = `nextpress upgrade` on healthy journal.
- `sites` entity bundles roles+userRoles (SiteEntityData) — import summary labels them under "sites"; correct by design.
- Uncommitted: transfer-cli.ts now logs failing SQL on error (better diagnostics).

## Contracts (fixed, so phases parallelize)

Runner argv contract (`dist/transfer-cli.js`):
- `export [--entities users,sites,pages,blogs,posts,comments,media,templates,options] [--site <slug>] [--with-media-files] [--out <container-path>]`
  - No `--entities` = all. Payload to stdout unless `--out`. Summary/logs to stderr. Exit 0/1.
- `import [--entities ...] [--mode overwrite|skip]`
  - Reads file from stdin (JSON or .tar.gz auto-detected by gzip magic bytes). Summary to stdout. Exit 0/1.
