# Nextpress Beta

A self-hostable publishing platform: websites, documentation sites, blogs, forms and team workflows on your own server and your own domains. WordPress-compatible, with a visual block editor, a built-in AI assistant and a full REST API.

## Packages

Published npm packages from this monorepo:

| Package | npm | Description | Docs |
|---------|-----|-------------|------|
| **SDK** | [`@nextpress-org/sdk`](https://www.npmjs.com/package/@nextpress-org/sdk) | TypeScript client for pages, posts, blocks, and editor workflows | [`packages/sdk/README.md`](packages/sdk/README.md) · [SDK guides](docs/sdk/README.md) |
| **MCP** | [`@nextpress-org/mcp`](https://www.npmjs.com/package/@nextpress-org/mcp) | MCP server for Cursor and Claude: agents edit content through the SDK | [`packages/mcp/README.md`](packages/mcp/README.md) |

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

## Why NextPress

- **Your server, your data.** Content, media and the database stay on infrastructure you control. NextPress runs anywhere Docker runs and sends no telemetry.
- **One install, many sites.** Each site gets its own domain, theme, pages, posts and settings, with HTTPS set up for you.
- **Built for people and agents.** A visual editor for humans, plus a REST API, official SDK and MCP server so scripts and AI agents can work with the same content.
- **AI included.** A page assistant and AI-managed themes, using an AI service and key you provide.
- **WordPress-compatible.** Import posts and pages from WordPress, and talk to a WordPress-style REST API for headless usage.

---

## What You Can Do With Nextpress

### Blocks (60+)

Nextpress ships **60+ blocks** for pages, posts, templates, and documentation sites. The builder panel groups them the same way:

**Basic**

- [x] Heading
- [x] Paragraph
- [x] Button
- [x] Buttons
- [x] Icon (see icon sets below)
- [x] Badge

**Form fields**

- [x] Form (see [Forms](#forms-and-submissions) below)
- [x] Text field (`core/input`)
- [x] Text area (`core/textarea`)
- [x] Dropdown (`core/select`)

**Media**

- [x] Image
- [x] Gallery
- [x] Video
- [x] Audio
- [x] Media & Text
- [x] Cover
- [x] File
- [x] Logo cloud

**Layout**

- [x] Spacer
- [x] Separator
- [x] Columns
- [x] Container
- [x] Group
- [x] Stack
- [x] Grid
- [x] Card
- [x] Header (full-site header with brand, links and buttons)
- [x] Accordion (holds accordion items)
- [x] Popup (opened by a button or link)
- [x] Steps (holds steps)
- [x] Tabs (holds tabs)

**Advanced**

- [x] Quote
- [x] Pullquote
- [x] List
- [x] Code
- [x] HTML
- [x] Preformatted
- [x] Table
- [x] Markdown
- [x] Search (opens site search; visitors can also press Ctrl+K / Cmd+K)
- [x] Divider

**Post**

- [x] Post Title
- [x] Excerpt
- [x] Featured Image
- [x] Post List (grid, list or card layouts)
- [x] TOC
- [x] Author Box
- [x] Comments
- [x] Navigation
- [x] Info
- [x] Progress

**Docs** (for [documentation sites](#documentation-sites))

- [x] Docs layout, docs page, callout, code group, file tree, params, example, diagram, update

**Icon block (4 icon sets) [Experimental]**

- [x] **Lucide** (1,700+ icons)
- [x] **react-icons** (9 libraries, ~28K icons)
- [x] **SVGL** (120+ brand logos, plus custom icon uploads)
- [x] **All** (search across every set)

### Multiple sites

Run more than one site from a single install:

- [x] Separate pages, posts, media, settings, and theme per site
- [x] Switch sites from the admin
- [x] Give each site its own domain, with HTTPS set up for you
- [x] Scope API keys to one site at a time

**Two sites, two domains**

1. Point each domain at your server: an A record with the server's IP. For a main domain like `example.com`, add `www` too if you want it.
2. In the admin, open **Sites → Add site**. Give it a name and its address, for example `shop.example.com`. The address check shows when the domain points at your server.
3. NextPress adds the address to the web server, which gets a certificate for it, usually within a minute.
4. Pick the site you are working on at the top of the admin. Pages, posts, media, settings and the theme all belong to that site.

Visitors see the site whose address they typed. An address that no site uses shows the default site. To try this on your own computer, give a second site an address like `http://site2.localhost:5000`; browsers send `*.localhost` to your own machine with no setup.

### WordPress import

Bring content over from an existing WordPress site:

- [x] Import published posts and pages from a public WordPress URL
- [x] Convert Gutenberg HTML and layout blocks into native NextPress blocks
- [x] Re-import to refresh content you already brought over

### AI assistant

An assistant built into the page editor and the admin:

- [x] Chat with the assistant inside the page builder to create and edit content
- [x] Persistent conversations: pick up where you left off
- [x] Bring your own AI service and key (multiple providers supported)
- [x] AI agents can manage themes through the SDK and MCP server: create, edit and activate

### Documentation sites

Publish documentation alongside your site, with dedicated docs blocks:

- [x] Docs sites with their own navigation and search
- [x] Docs-specific blocks: callouts, code groups, file trees, params, examples, diagrams, update markers
- [x] Docs pages use the same block editor as pages and posts

### Blogs and posts

- [x] Multiple blogs per site, each with its own layout
- [x] Blog-aware post editor with Markdown-style shortcuts and slash commands
- [x] Post blocks for title, excerpt, featured image, lists, TOC, author box, comments, navigation, info and reading progress
- [x] Categories and tags on posts
- [x] Visitor comments with moderation

### People and roles

- [x] Roles per site: subscriber, editor, admin, owner
- [x] Invite people with invitation links
- [x] Permission-aware dashboard
- [x] Change your password; an admin locked out can reset one from the server

### Themes

- [x] Visual theme editor with live preview
- [x] Theme presets to start from
- [x] Import and export themes between installs
- [x] Per-site themes

### Forms and submissions

- [x] Form block with text, textarea, dropdown and button fields
- [x] Submissions inbox in the admin
- [x] Export submissions as CSV
- [x] Form success popups

### Content portability

Move content without touching the database:

- [x] Export/import whole pages, with images and themes, between NextPress sites
- [x] Copy and paste blocks between sites
- [x] Full-install `nextpress export` / `import` / `reset` CLI for backups and server moves (see [`docs/cli-usage.md`](docs/cli-usage.md))

### Search and discovery

- [x] Search block and site-wide search (Ctrl+K / Cmd+K)
- [x] Automatic XML sitemap
- [x] RSS feed
- [x] Social previews (Open Graph and Twitter Card tags)

### Performance

- [x] Published-page caching with automatic invalidation on content or theme changes
- [x] Page prefetching for faster navigation
- [x] Response compression and image lazy-loading
- [x] Self-hosted fonts, no third-party font CDN

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
- [x] Themes management
- [x] Page transfer (cross-site export/import)
- [x] Form submissions
- [x] Preview mode for drafts
- [x] Preview **share links** (token-based, no login)
- [x] Public REST API for headless CMS usage

### Page Builder

The visual editor for creating and arranging content:

- [x] Block-based editing with drag and drop
- [x] Inline canvas text editing
- [x] Markdown-style shortcuts and slash commands
- [x] Device preview (Desktop, Tablet, Mobile)
- [x] Motion and animation controls per block
- [x] Cmd+K navigation and site search
- [x] Sortable content lists and drag-to-reorder
- [x] Responsive overflow checks
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
- Linked template parts: design a header, footer or section once and show it on many pages; edits reach every page that uses it

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

- [x] WordPress-style action and filter hooks
- [x] Plugins admin: add, turn on or off, and remove (no outside-code loader yet)
- [x] Theme system with visual editor, presets and import/export
- [x] Linked template parts: reusable headers, footers and sections shared across pages
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
| Updates | One-click updates from the dashboard (opt-in per install) |
| Portability | `nextpress export` / `import` / `reset` for backups and server moves |
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
| Public REST search endpoint (visitor-facing site search already ships) | Pending |
| Inspector panel (visual page layout tool) | Not started |
| Website builder UI refinements | Ongoing |

## Getting Involved

We welcome contributions from the community. Here is how to help:

- **Reach out**: [info@nextpress.ai](mailto:info@nextpress.ai)
- **Experimental features**: Check the `docs/` directory before contributing to experimental areas, as APIs may change
- **Issue reporting**: Use the GitHub issue tracker at github.com/nextpress-ai/nextpress
- **Pull requests**: All contributions must pass `pnpm check` and the test suite

Nextpress is released under the GPL v3 license. See the LICENSE file for full details.
