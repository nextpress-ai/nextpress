# Nextpress Beta

A self-hostable WordPress-compatible CMS built in JavaScript/TypeScript.

## Packages

Published npm packages from this monorepo:

| Package | npm | Description | Docs |
|---------|-----|-------------|------|
| **SDK** | [`@nextpress-org/sdk`](https://www.npmjs.com/package/@nextpress-org/sdk) | TypeScript client for pages, posts, blocks, and editor workflows | [`packages/sdk/README.md`](packages/sdk/README.md) · [SDK guides](docs/sdk/README.md) |
| **MCP** | [`@nextpress-org/mcp`](https://www.npmjs.com/package/@nextpress-org/mcp) | MCP server for Cursor and Claude — agents edit content through the SDK | [`packages/mcp/README.md`](packages/mcp/README.md) |

```bash
pnpm add @nextpress-org/sdk    # programmatic CMS API
npx @nextpress-org/mcp         # MCP server for Cursor / Claude
```

## Quick Start

Get started quickly with local development:

```bash
git clone https://github.com/nextpress-ai/nextpress nextpress
pnpm install
pnpm dev
```

This uses [PGlite](https://pglite.dev/) (embedded PostgreSQL) for development, so you do not need Docker locally.

## Self-Hosting

### NextPress Installer

Install NextPress from the GitHub repo with one command. The installer adds the standalone **`nextpress`** command, provisions the server, and leaves the command available for install, upgrade, status, logs, restart, reload, and uninstall operations.

```bash
curl -fsSL https://raw.githubusercontent.com/nextpress-ai/nextpress/main/install.sh | bash
```

The installer checks for Docker Compose v2, installs the **`nextpress`** command into **`/usr/local/bin`**, verifies the command, and runs **`nextpress install`** before finishing.

References:

- [`docs/cli-usage.md`](docs/cli-usage.md), command usage and options.
- [`docs/upgrade-flow.md`](docs/upgrade-flow.md), schema-aware upgrades and override mode.

*NextPress can be self-hosted anywhere Docker runs.*

App image on Docker Hub: [https://hub.docker.com/r/husseinkizz/nextpress](https://hub.docker.com/r/husseinkizz/nextpress)

---

## What You Can Do With Nextpress

### Blocks (39 total)

Nextpress ships **39 blocks** for pages, posts, and templates.

| Category | Count | Status |
|----------|-------|--------|
| Basic | 12 | Stable |
| Layout | 6 | Stable |
| Media | 8 | Stable |
| Form | 3 | Stable |
| Post | 10 | Stable |

**Basic blocks (12)**

- [x] Heading
- [x] Paragraph
- [x] Button
- [x] Buttons
- [x] Quote
- [x] Pullquote
- [x] List
- [x] Code
- [x] HTML
- [x] Markdown
- [x] Preformatted
- [x] Table

**Layout blocks (6)**

- [x] Columns
- [x] Group
- [x] Container
- [x] Spacer
- [x] Separator
- [x] Divider

**Media blocks (8)**

- [x] Image
- [x] Gallery
- [x] Video
- [x] Audio
- [x] Cover
- [x] Media Text
- [x] File
- [x] Icon (see icon sets below)

**Form blocks (3)**

- [x] Text field (`core/input`)
- [x] Text area (`core/textarea`)
- [x] Dropdown (`core/select`)

**Icon block (4 icon sets) [Experimental]**

- [x] **Lucide** (1,736 icons)
- [x] **react-icons** (9 libraries, ~28K icons)
- [x] **SVGL** (120+ brand logos)
- [x] **All** (search across every set)

**Post blocks (10)**

- [x] Post Title
- [x] Featured Image
- [x] Excerpt
- [x] Post List
- [x] TOC
- [x] Author Box
- [x] Comments
- [x] Navigation
- [x] Info
- [x] Progress

### Multiple sites

Run more than one site from a single install:

- [x] Separate pages, posts, media, and settings per site
- [x] Switch sites from the admin
- [x] Scope API keys to one site at a time

### WordPress import

Bring content over from an existing WordPress site:

- [x] Import published posts and pages from a public WordPress URL
- [x] Convert Gutenberg HTML and layout blocks into native NextPress blocks
- [x] Re-import to refresh content you already brought over

### REST API

WordPress-compatible endpoints for headless or traditional usage:

- [x] Posts CRUD
- [x] Pages CRUD
- [x] Media library (upload, resize, SVG support)
- [x] Users and role management
- [x] Comments
- [x] Blogs
- [x] Authentication (Better Auth + session)
- [x] Scoped **API keys** for scripts and integrations
- [x] Multi-site scoping on keys and content
- [x] Site settings
- [x] Site options
- [x] Dashboard data
- [x] Templates CRUD
- [x] **WordPress import** (posts and pages)
- [ ] Themes management
- [x] Preview mode for drafts
- [x] Preview **share links** (token-based, no login)
- [x] Public REST API for headless CMS usage

### Page Builder

The visual editor for creating and arranging content:

- [x] Block-based editing with drag and drop
- [x] Device preview (Desktop, Tablet, Mobile)
- [x] Page settings (title, slug, template, status, SEO meta, fonts, width, padding)
- [x] Block settings (styles, spacing, colors, hover states, link URLs)
- [x] Typography and corner-shape presets in settings
- [x] Gallery with grid layout, per-image editing, captions, and links on the published page
- [x] Column and group layout that matches the published page
- [x] Icon picker with browse-before-search across 4 icon sets
- [x] Live preview from the editor canvas (current unsaved layout)
- [x] Preview and publish use the same production renderer
- [x] Undo and redo
- [x] Auto-save
- [x] Self-hosted catalog fonts (no third-party font CDN)
- [x] In-app What's New when you upgrade

### Template System [Experimental]

Create reusable page layouts with dynamic content:

- [x] Template variables like `{{site.title}}`, `{{post.author}}`, etc.
- [x] Conditional display logic (show/hide based on conditions)
- [x] Edit templates directly in the builder
- [x] Insert templates into pages and posts
- Template variables: site, post, page, author, date (24 total variables available)
- Condition types: is_home, is_single, is_page, post_in_category, etc.

### SEO Features

Built-in tools for search engine optimization:

- [x] Custom meta title and description per page
- [x] Canonical URL setting
- [x] Noindex option (robots.txt control)
- [x] Custom meta tags for specialized needs
- [x] Open Graph tags for social sharing
- [x] Twitter Card tags
- [x] Automatic robots.txt generation

### Extensibility

Built to grow with your needs:

- [ ] WordPress-style action and filter hooks for plugins
- [ ] Theme system with template overrides
- [x] Template system for creating reusable layouts
- [x] Public REST API for headless usage
- [x] Official SDK ([`@nextpress-org/sdk`](packages/sdk/README.md)): pages, posts, blocks, editor sessions, preview links
- [x] API keys with permission presets in Settings
- [x] WordPress import for migration workflows

### Infrastructure

The technical foundation that makes it all work:

| Component | What it means for you |
|-----------|-----------------------|
| Database (development) | PGlite embedded PostgreSQL, zero local setup |
| Database (production) | Full PostgreSQL support |
| Hosting | Runs anywhere Docker runs |
| Install | One-command setup script |
| Setup | Web-based wizard for initial configuration |
| Upgrades | CLI-driven upgrades with schema checks and backups |
| Health check | `/api/health` for monitoring and orchestration |

## Current Focus

Active development areas:

| Area | What we are building |
|------|----------------------|
| **SDK** | [`@nextpress-org/sdk`](packages/sdk/README.md): block builder, page defaults, editor sessions (beta on npm) |
| **NextPress MCP** | [`@nextpress-org/mcp`](packages/mcp/README.md): stdio MCP for Cursor/Claude over the SDK ([getting started](docs/mcp/getting-started.md)) |
| **Editor improvements** | Ongoing page builder polish and accessibility |
| **WordPress compatibility and imports** | Deeper Gutenberg mapping, re-import, REST parity |
| **AI-powered features** | Assisted editing and automation on SDK and MCP |

Questions, partnerships, or early access: **[info@nextpress.ai](mailto:info@nextpress.ai)**

### Planned Features

These features are on our roadmap:

| Feature | Status |
|---------|--------|
| Categories endpoint (for post organization) | Pending |
| Tags endpoint (for post tagging) | Pending |
| Search endpoint (content discovery) | Pending |
| Inspector panel (visual page layout tool) | Not started |
| Documentation website (dedicated docs site) | Not started |
| Website builder UI refinements | Not started |

## Getting Involved

We welcome contributions from the community. Here is how to help:

- **Reach out**: [info@nextpress.ai](mailto:info@nextpress.ai)
- **Experimental features**: Check the `docs/` directory before contributing to experimental areas, as APIs may change
- **Issue reporting**: Use the GitHub issue tracker at github.com/pabloh3/nextpress1
- **Pull requests**: All contributions must pass `pnpm check` and the test suite

Nextpress is released under the GPL v3 license. See the LICENSE file for full details.
