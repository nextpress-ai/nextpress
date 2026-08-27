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
- [ ] Owner smoke-tests `nextpress export` / `nextpress import` on a real install
- [x] Update context.md decision record; mark task complete

## Contracts (fixed, so phases parallelize)

Runner argv contract (`dist/transfer-cli.js`):
- `export [--entities users,sites,pages,blogs,posts,comments,media,templates,options] [--site <slug>] [--with-media-files] [--out <container-path>]`
  - No `--entities` = all. Payload to stdout unless `--out`. Summary/logs to stderr. Exit 0/1.
- `import [--entities ...] [--mode overwrite|skip]`
  - Reads file from stdin (JSON or .tar.gz auto-detected by gzip magic bytes). Summary to stdout. Exit 0/1.
