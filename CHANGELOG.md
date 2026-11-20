# Changelog

All notable changes to Nextpress are documented here. Entries are condensed
from the GitHub release notes; each version's notes are cumulative, so a
feature is listed under the first release that introduced it.

## [1.6.0] - 2026-11-05

### Added
- **Unified docs and post editing**: documentation pages and posts use the same block editor as pages, with Markdown-style shortcuts (`##`, `-`, `/`), rich-text formatting and slash commands. Older docs pages convert automatically.
- **Publish on docs import**: importing a page file can publish every page as it arrives, or keep them as drafts.
- **Password change and reset**: change your password from the account menu; an admin locked out can set a new one from the server with `nextpress reset-password`.

### Fixed
- Editing on phones: the side panel starts closed on small screens and the top bar always keeps Save and Publish reachable.
- Docs and post editors: empty paragraphs show where to write, and links in text no longer leave the editor.
- Menus, dialogs and hover states render correctly in light and dark mode.
- The editor matches the published page for settings, width and padding.
- Upgrades apply every database change, including ones from versions in between.
- Your domain opens the published homepage; pages answer at short addresses like `/contact`.
- Imported pages keep their styles, theme and fonts; pages with effects, popups or floating headers no longer render blank.
- Page titles no longer show a site address; theme names can be edited safely.

## [1.5.0] - 2026-10-28

### Added
- **AI assistant in the page editor**: chat with an assistant inside the builder; conversations persist between sessions.
- **Documentation sites**: write docs with a sidebar, search, previous/next links and a copy button on every page, on your site or a separate address.
- **Blog writing editor**: posts open in a calm writing editor and take on the look set once for the whole blog; the blog home lists posts as cards, a grid or a list.
- **Linked template parts**: build a header, footer or section once under Templates and reuse it on many pages.
- **Roles and invite links**: subscriber, editor, admin and owner roles per site, with invitation links; the dashboard shows only what each person can do.
- **One-click updates**: owners and admins of the main site can update from the dashboard while sites stay online.
- **Site search and sitemap**: a Search block for visitors, and an XML sitemap for search engines.

## [1.4.2] - 2026-10-02

### Added
- **Themes for an assistant**: an assistant connected to your site can list themes, create one, change its colors and type, and switch it on.
- **Link previews**: shared links show your site name and a picture (featured image, first page image or logo).
- **Per-screen visibility**: show a header element or any block on desktop or mobile only.
- Page prefetching and smaller compressed responses for faster published pages.
- Picture loading improvements: images keep their space with a shimmer until loaded.

## [1.4.1] - 2026-10-02

### Added
- **Published-page caching**: a published page is saved after the first visit and reused until you save it or change the theme; dynamic parts stay current.

## [1.4.0] - 2026-09-30

### Added
- Form layouts (rows or columns with custom spacing) and custom dropdown styling.
- **Thank-you popup**: after a form is sent, a popup with a check mark shows your message and the form clears.
- Max-width alignment (Left, Center, Right) and one-click mobile overflow fixes.
- Tidier page and post lists; refreshed admin look.

## [1.3.10] - 2026-09-29

### Added
- **Form block**: add a form to any page; submissions appear under Forms, ready to read or export.
- Header spacing controls and button icon sizing.

## [1.3.9] - 2026-09-29

### Added
- **Page transfer**: export a page with its images and theme, then import it on another NextPress site as a draft, with links following taken addresses. Copy and paste blocks between sites.

## [1.3.8] - 2026-09-29

### Notes
- No independently documented additions; same feature set as 1.3.7.

## [1.3.7] - 2026-09-29

### Added
- **Advanced layout blocks**: accordion, popup and a full-site header.
- Brand logos (svgl) and custom icon uploads.
- **Motion effects**: subtle animations for blocks and backgrounds.
- **Duplicate pages**.
- **Plugin management**: add plugins and turn them on or off.
- Post lists open in place for visitors.
- Colors, gradients and theme colors on any block; cleaner builder settings; refreshed admin look.

## [1.3.6] - 2026-08-27

### Added
- **Data export/import CLI**: `nextpress export` and `nextpress import` move a whole installation between servers.
  - Entities: users, sites, pages, blogs, posts, comments, media, templates, options. No entity flags = all entities.
  - `nextpress export --site <name>` scopes to one site (matches site name or hostname); default exports every site.
  - `nextpress export --with-media-files` bundles uploaded files into a `.tar.gz`; the default format is plain JSON.
  - `nextpress import --mode overwrite` (default) updates existing rows by UUID; `--mode skip` leaves them untouched.
  - The engine lives in `server/transfer/`; the in-container runner (`dist/transfer-cli.js`) is invoked by the bash CLI via `docker compose exec`, so the database never leaves the server.
  - Removed the legacy npm `@nextpress-org/cli` package: the bash CLI (`scripts/nextpress`) is the only shipped command.
  - **`nextpress reset`**: wipes the instance back to a fresh install (drops all data, clears uploaded media, re-applies migrations, seeds default content). Auto-backs up the database first and prompts for confirmation unless `--yes` is given. Enables `export` → `reset` → `import` workflows.

### Changed
- Export/import now logs the failing SQL on error, making schema-drift failures (an install whose database predates recent migrations) diagnosable instead of a bare `column "X" does not exist`.

### Notes
- Requires migrations through `0008` applied (`nextpress upgrade`). On an install whose database predates them, export fails with `column "X" does not exist` until migrations run.

## [1.3.5] - 2026-08-18

### Added
- **Edit text right on the page**: change headings, paragraphs, quotes and tables in the canvas without opening the sidebar.
- **Site theme editor**: colors, typography, buttons and icon defaults, with presets and theme file import/export.
- **Cmd+K quick actions**: jump to pages, posts, media and settings from anywhere in the admin.
- **Draft preview while you edit**, including drafts.
- Table or card views for content lists; drag to reorder posts and pages; mobile overflow check with one-click fixes; undo when you delete a block.

### Fixed
- Preview, builder and published pages use the same rendering; post blocks show real post data; no white flash on navigation.

## [1.3.4] - 2026-07-26

### Notes
- Maintenance release; same documented feature set as 1.3.3.

## [1.3.3] - 2026-07-12

### Added
- **Bulk delete** for pages and posts with a confirmation step.
- Protected homepage and blog pages that cannot be deleted by mistake.
- Catalog fonts served from your own install (no external font service).
- Galleries and forms render identically in builder, preview and on the live site.
- Icon picker shows one page at a time so you can browse before searching.

## [1.3.1] - 2026-06-28

### Notes
- Patch release; same documented feature set as 1.3.0.

## [1.3.0] - 2026-06-28

### Added
- **Multisite**: multiple isolated sites per installation with separate pages, posts, media and settings.
- **WordPress import**: import published posts and pages from a public WordPress URL, with re-import support.
- More reliable sign-in on a stronger auth foundation.
