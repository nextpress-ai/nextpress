# Nextpress Beta

A self-hostable WordPress-compatible CMS built in JavaScript/TypeScript.

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
- [`packages/cli/README.md`](packages/cli/README.md), command package notes.

*NextPress can be self-hosted anywhere Docker runs.*

App image on Docker Hub: [https://hub.docker.com/r/husseinkizz/nextpress](https://hub.docker.com/r/husseinkizz/nextpress)

---

## What You Can Do With Nextpress

### Blocks (42 total)

Nextpress comes with a growing collection of blocks for building pages and posts.

| Category | Count | Status |
|----------|-------|--------|
| Basic | 25 | Stable |
| Icon | 1 | Experimental |
| Post | 10 | Stable |

**Basic blocks (25) - Ready to use**

- [x] Heading
- [x] Paragraph
- [x] Button
- [x] Buttons
- [x] Image
- [x] Video
- [x] Audio
- [x] File
- [x] Spacer
- [x] Separator
- [x] Divider
- [x] Columns
- [x] Group
- [x] Container
- [x] Quote
- [x] Pullquote
- [x] List
- [x] Media Text
- [x] Cover
- [x] Code
- [x] HTML
- [x] Markdown
- [x] Preformatted
- [x] Table
- [x] Gallery

**Icon block (1) - [Experimental]**

- [x] Icon block with icon sets: Lucide (1,736), react-icons (9 sets, ~28K), SVGL (120+ brands)

**Post blocks (10) - Ready to use**

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

### REST API

WordPress-compatible endpoints for headless or traditional usage:

- [x] Posts CRUD
- [x] Pages CRUD
- [x] Media library (upload, resize, SVG support)
- [x] Users and role management
- [x] Comments
- [x] Blogs
- [x] Authentication (login/logout/session)
- [x] Site settings
- [x] Site options
- [x] Dashboard data
- [x] Templates CRUD
- [ ] Themes management
- [x] Preview mode for drafts
- [x] Public REST API for headless CMS usage

### Page Builder

The visual editor for creating and arranging content:

- [x] Block-based editing with drag and drop
- [x] Device preview (see how your site looks on Desktop, Tablet, Mobile)
- [x] Page settings (title, slug, template, status, SEO meta)
- [x] Block settings (styles, spacing, colors, link URLs)
- [x] Live preview of changes
- [x] Undo/redo functionality
- [x] Auto-save to prevent lost work

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
- [x] Public REST API enabling headless CMS usage

### Infrastructure

The technical foundation that makes it all work:

| Component | What it means for you |
|-----------|-----------------------|
| Database (dev) | PGlite embedded PostgreSQL - zero setup for development |
| Database (prod) | Full PostgreSQL support for production deployments |
| Hosting | Runs anywhere Docker runs |
| Install | One-command setup script gets you running fast |
| Setup | Web-based wizard walks you through initial configuration |
| Health check | `/api/health` endpoint for monitoring and orchestration |

## Current Focus Areas

We are actively working on stabilizing these areas:

### Known Issues

These are bugs we are tracking and fixing:

| Issue | Status |
|-------|--------|
| Posts do not save content or slug | Pending fix |
| Cannot set page as homepage | Pending fix |
| Error creating duplicated page | In progress |
| Columns do not fit content properly | In progress |
| Comments | Needs polish |
| Media support (SVG, resize) | Needs polish |

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

- **Experimental features**: Check the `docs/` directory before contributing to experimental areas, as APIs may change
- **Issue reporting**: Use the GitHub issue tracker at github.com/pabloh3/nextpress1
- **Pull requests**: All contributions must pass `pnpm check` and the test suite

Nextpress is released under the GPL v3 license. See the LICENSE file for full details.
