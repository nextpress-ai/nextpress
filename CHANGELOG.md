# Changelog

All notable changes to Nextpress are documented here.

## [1.3.6] - 2026-08-27

### Added
- **Data export/import CLI** — `nextpress export` and `nextpress import` move a whole installation between servers.
  - Entities: users, sites, pages, blogs, posts, comments, media, templates, options. No entity flags = all entities.
  - `nextpress export --site <name>` scopes to one site (matches site name or hostname); default exports every site.
  - `nextpress export --with-media-files` bundles uploaded files into a `.tar.gz`; the default format is plain JSON.
  - `nextpress import --mode overwrite` (default) updates existing rows by UUID; `--mode skip` leaves them untouched.
  - The engine lives in `server/transfer/`; the in-container runner (`dist/transfer-cli.js`) is invoked by the bash CLI via `docker compose exec`, so the database never leaves the server.
  - Removed the legacy npm `@nextpress-org/cli` package — the bash CLI (`scripts/nextpress`) is the only shipped command.

### Changed
- Export/import now logs the failing SQL on error, making schema-drift failures (an install whose database predates recent migrations) diagnosable instead of a bare `column "X" does not exist`.

### Notes
- Requires migrations through `0008` applied (`nextpress upgrade`). On an install whose database predates them, export fails with `column "X" does not exist` until migrations run.
