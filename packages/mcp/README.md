# @nextpress-org/mcp

Official [Model Context Protocol](https://modelcontextprotocol.io/) server for [NextPress](https://github.com/nextpress-ai/nextpress).

Connect Cursor, Claude Desktop, or any MCP client to your site so an agent can create pages, edit blocks, upload media, and publish drafts — while you keep using the NextPress admin for the same content.

Built on [`@nextpress-org/sdk`](https://www.npmjs.com/package/@nextpress-org/sdk). Requires Node 20+. **MCP 0.3 needs SDK 0.3** (page tools, template parts, form answers and brand logos come from it).

## What you can do

- **Read site context** — branding, settings, health, and a slug map of pages and posts
- **Create and edit pages and posts** — draft-first; publish when you are ready
- **Build and change pages block by block** — read a short outline, add or change one section at a time, and let the server's own checks (structure, save rules, phone layout) refuse a bad change before it is saved
- **Follow the design guide** — the same guide the editor's assistant uses ships as a prompt and a resource
- **Write docs** — make a docs, arrange its pages, and write each page with the normal page and block tools, using the docs blocks
- **Undo** — list a page's earlier versions and put one back
- **Reuse shared headers and footers** — list, create and check where template parts are used
- **Read form answers** — what visitors sent through the site's forms
- **Patch block trees** — insert, update, move, replace, or delete blocks with ready-made block objects (kept for compatibility; `change_page_blocks` is easier)
- **Validate blocks** — check a layout against the NextPress block registry before saving
- **Upload media** — add files from a path or base64 payload, or copy a brand logo from svgl.app
- **Share previews** — generate time-limited preview links for drafts
- **Work safely alongside the dashboard** — writes use version numbers so agent edits do not silently overwrite yours

## Prerequisites

1. A running NextPress instance (self-hosted or local dev)
2. An API key from **Settings → System → API Keys**
3. The site UUID for the site that key belongs to

For agent work, the **Content editor** preset is enough: read and write all content types, plus preview links.

## Install

```bash
npm install -g @nextpress-org/mcp
# or run without installing
npx @nextpress-org/mcp --help
```

## Configure Cursor

Add to your MCP settings:

```json
{
  "mcpServers": {
    "nextpress": {
      "command": "npx",
      "args": ["-y", "@nextpress-org/mcp"],
      "env": {
        "NEXTPRESS_URL": "https://your-site.example",
        "NEXTPRESS_API_KEY": "npk_live_…",
        "NEXTPRESS_SITE_ID": "your-site-uuid"
      }
    }
  }
}
```

Claude Desktop uses the same shape in `claude_desktop_config.json`.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTPRESS_URL` | yes | Base URL of your NextPress instance (for example `https://cms.example.com` or `http://localhost:5000`) |
| `NEXTPRESS_API_KEY` | yes | Bearer key from the dashboard (`npk_live_…`) |
| `NEXTPRESS_SITE_ID` | yes | Site UUID — the same site you chose when creating the key |

CLI flags override env when both are set: `--url`, `--api-key`, `--site-id`.

Keys are created and revoked in the dashboard only. This package uses keys; it does not create them.

## Agents and the admin, same content

NextPress is designed so humans and agents can share one CMS:

1. You create a scoped API key in the dashboard.
2. The agent connects through this MCP server using that key.
3. You continue editing in the admin with your normal login.
4. Both paths read and write the same pages, posts, and media.

When the agent updates content, it must send the current `expectedVersion` from a recent `get_page` or `get_post` call. If you saved changes in the admin first, the agent gets `VERSION_STALE` and should fetch the latest version before retrying — not force an overwrite.

New pages and posts default to **draft** until you or the agent publishes them explicitly.

## Tools

### Build and change a page

These tools take `id` (a page's UUID or slug) and an optional `content_type` (`"page"` by default, or `"post"` for a blog post; a post needs its UUID). Each call loads the page fresh and saves with its version number, so if you saved in the dashboard in the meantime the agent is told to read again instead of overwriting your work. Changes sent at the same moment to the same page are applied one after another.

| Tool | What it does |
|------|----------------|
| `get_page_outline` | Short indented outline of the page: one line per block with its id, name and key content. Read this first, and again after anything changed the page. |
| `get_page_block` | One block in full (content, styles, settings, children). Takes the page in `id` and the block in `block_id`. |
| `change_page_blocks` | Insert, update, delete, move or replace blocks, up to 50 ops per call, all or nothing. Blocks are described simply (`name`, `content`, `styles`, `children`) and start from the editor's defaults; `core/` can be left out of a name. Give a new block a `ref` (such as `"hero"`) and later ops in the same call can put blocks inside it. A content field the block doesn't have is refused with a guess at what was meant. A change that would add a problem the server would refuse is not saved, and the reply says why; otherwise the reply checks the whole page. |
| `check_page` | Lists every problem on the page: structure, save rules, placement and phone layout. `change_page_blocks` already checks after each change; use this to review a page you didn't just change. |
| `apply_page_phone_fixes` | Repairs the phone-layout warnings that have an obvious fix and saves the page. |

### Block types and the guide (no page needed)

| Tool | What it does |
|------|----------------|
| `list_block_types` | Every block with its kind, category and a note on when to use it. |
| `get_block_type` | One block in detail: where it may sit, when to use it, its content fields, and an example exactly as the editor inserts it. |
| `get_design_guide` | The page design guide (page shape, words, colours, spacing, phones, pictures and links). |

### Site, pages, posts and blogs

| Tool | What it does |
|------|----------------|
| `get_site_context` | Site branding, theme, settings, and health |
| `list_pages` / `get_page` | Find and load pages |
| `create_page` / `update_page` | Create drafts, or change a page's title, slug and status (or replace its whole block tree) |
| `publish_page` | Set a page to published |
| `get_page_history` | A page's earlier versions with their block counts |
| `restore_page_version` | Put an earlier version back; needs `expectedVersion` so it never undoes newer work |
| `list_blogs` / `get_blog` / `create_blog` | Blogs (needed before `create_post`) |
| `list_posts` / `get_post` / `create_post` / `update_post` / `publish_post` | Blog posts |
| `preview_page` / `preview_post` | Preview share URL |

### Templates, themes and media

| Tool | What it does |
|------|----------------|
| `list_template_parts` | Shared headers, footers and sections, with how many pages use each (`usedOnPages`) |
| `create_template_part` | Make a part from a root block or from ready-made blocks |
| `get_template_part_usage` | The pages that show a part; check before changing one |
| `list_templates` / `get_template` | Ready-made templates (copied into a page, not linked) |
| `list_themes` / `get_theme` / `create_theme` / `update_theme` / `activate_theme` | Installed themes and which one the site uses |
| `list_media` / `upload_media` | Media library |
| `copy_brand_logo` | Save a brand logo from svgl.app into the library and get its `url` |
| `list_form_submissions` | Read what visitors sent through the site's forms (read only) |

### Docs

Docs are a set of pages with their own header, sidebar and search. Pages are drafts until the owner asks for publishing (`publish_page`). Every tool that changes a docs answers in plain words, and a refusal says what to do next.

| Tool | What it does |
|------|----------------|
| `list_docs` | Lists this site's docs: each one's id (`homeId`), name, address, page count and whether search is on. |
| `create_docs` | Makes a docs with its home page as the first page. Give a name, and optionally the first part of its address (such as `docs`). |
| `get_docs_tree` | Reads a docs' navigation: every page and group in sidebar order, with ids, addresses, kinds, hidden flags, and the header settings. |
| `update_docs_settings` | Changes a docs' name, logos, header links (up to six), header button, search button, and frame switches. Only the fields you send change. |
| `add_docs_page` | Adds a page (it holds text) or a group (a sidebar heading that holds pages) under a page or group, or at the top. A new page starts empty. |
| `update_docs_page` | Renames a page or group, changes its address, moves it under another, hides it from the sidebar or shows it again, or switches between page and group. |
| `reorder_docs_pages` | Sets the order of the pages under one parent. The list must name every page under that parent, once each. |
| `delete_docs_page` | Deletes a page or group. A page with pages under it is refused until those are moved or deleted. |
| `get_docs_guide` | A short guide to making a docs and which blocks its pages use: the same text as the `write_docs` prompt. |

### Ready-made blocks

| Tool | What it does |
|------|----------------|
| `build_blocks` | Turn block descriptions into ready-made blocks for `create_page` or `create_template_part`. Same block shape as `change_page_blocks`, built the same way. |

### To be removed in 0.4

| Tool | What it does |
|------|----------------|
| `validate_blocks` | Validate a block tree without saving. Use `check_page`. |
| `patch_page_blocks` / `patch_post_blocks` | Insert, update, move, replace or delete ready-made blocks with `expectedVersion`. Use `change_page_blocks`. |

## Prompts

| Prompt | What it is for |
|--------|----------------|
| `build_page` | Optional `purpose` and `audience`. The design guide plus the steps to build a page: outline, block types, small changes, check, preview, and leave it as a draft for the owner. |
| `edit_block` | `id` (the page), `block_id` and `request`. Changes one block and tells the agent to stay inside it. |
| `write_docs` | `topic` (what the docs are about) and an optional `audience`. The docs writing guide, and the steps to find the docs, plan the pages, write them, check the links, and leave them as drafts for the owner. |

## Resources

| URI | What it contains |
|-----|------------------|
| `nextpress://design-guide` | The page design guide (markdown) |
| `nextpress://docs/guide` | The docs guide (markdown): how a docs is made and which blocks its pages use |
| `nextpress://blocks/catalog` | Block names and metadata, each with a note on when to use it |
| `nextpress://blocks/schema` | Block schema catalog (types, child rules) |
| `nextpress://site/map` | Slug map of pages and posts |
| `nextpress://site/context` | Same payload as `get_site_context` |

## How an agent should build a page

Start from the `build_page` prompt (in Claude Code it appears as `/mcp__nextpress__build_page`). It carries the design guide and the order that works:

1. Learn the site: `get_site_context`, `list_pages`, `list_media`, `list_template_parts`.
2. Make a draft with `create_page` (a title is enough), then read it with `get_page_outline`.
3. Look up blocks with `list_block_types` and `get_block_type`.
4. Build one section per `change_page_blocks` call. Each reply lists the new blocks with their ids and checks the page. An empty page gets its page shell with the first block.
5. If a reply lists phone warnings, run `apply_page_phone_fixes`.
6. Send the owner a link with `preview_page`.
7. Leave the page as a draft. Publish only when the owner asks.

To change one block, use the `edit_block` prompt.

If an agent makes a mistake, `get_page_history` shows earlier versions and `restore_page_version` puts one back.

## Logs

Problems the server could not recover from are written to stderr as one JSON line each, with the tool name, the page id and the cause. stdout is reserved for the MCP protocol.

## Development

From the NextPress monorepo:

```bash
pnpm mcp:build
pnpm mcp:test
pnpm mcp:test:integration   # needs a running server and integration config
```

Publish from `packages/mcp`:

```bash
pnpm build && pnpm test
pnpm publish --access public
```

Local MCP config without npm:

```json
{
  "mcpServers": {
    "nextpress": {
      "command": "node",
      "args": ["/absolute/path/to/nextpress/packages/mcp/dist/index.js"],
      "env": {
        "NEXTPRESS_URL": "http://localhost:5000",
        "NEXTPRESS_API_KEY": "npk_live_…",
        "NEXTPRESS_SITE_ID": "your-site-uuid"
      }
    }
  }
}
```

## Related

| Package | Role |
|---------|------|
| [`@nextpress-org/sdk`](https://www.npmjs.com/package/@nextpress-org/sdk) | TypeScript client this MCP wraps |

Questions or early access: **[info@nextpress.ai](mailto:info@nextpress.ai)**
