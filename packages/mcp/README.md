# @nextpress-org/mcp

Official [Model Context Protocol](https://modelcontextprotocol.io/) server for [NextPress](https://github.com/nextpress-ai/nextpress).

Connect Cursor, Claude Desktop, or any MCP client to your site so an agent can create pages, edit blocks, upload media, and publish drafts — while you keep using the NextPress admin for the same content.

Built on [`@nextpress-org/sdk`](https://www.npmjs.com/package/@nextpress-org/sdk). Requires Node 20+.

## What you can do

- **Read site context** — branding, settings, health, and a slug map of pages and posts
- **Create and edit pages and posts** — draft-first; publish when you are ready
- **Patch block trees** — insert, update, move, or delete blocks without replacing the whole page
- **Validate blocks** — check a layout against the NextPress block registry before saving
- **Upload media** — add files from a path or base64 payload
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

| Tool | What it does |
|------|----------------|
| `get_site_context` | Site branding, theme, settings, and health |
| `list_pages` / `get_page` | Find and load pages |
| `create_page` / `update_page` | Create drafts or update existing pages |
| `publish_page` | Set a page to published |
| `list_posts` / `get_post` / `create_post` / `update_post` | Blog posts |
| `list_templates` / `get_template` | Reusable templates |
| `list_media` / `upload_media` | Media library |
| `preview_page` | Preview share URL for a page |
| `list_block_types` / `build_blocks` | Block catalog and tree builder |
| `validate_blocks` | Validate a block tree without saving |
| `patch_page_blocks` / `patch_post_blocks` | Targeted block edits (prefer over full-tree replace) |

## Resources

| URI | What it contains |
|-----|------------------|
| `nextpress://blocks/catalog` | Block names and metadata |
| `nextpress://blocks/schema` | Block schema catalog (types, child rules) |
| `nextpress://site/map` | Slug map of pages and posts |
| `nextpress://site/context` | Same payload as `get_site_context` |

## Suggested workflow

1. Read `nextpress://site/context` or call `get_site_context` to learn the site.
2. Call `list_block_types` or read `nextpress://blocks/catalog` before building layouts.
3. Use `build_blocks`, then `create_page` (draft) or `patch_page_blocks` on existing content.
4. Call `preview_page` when you need a shareable draft link.
5. Publish from the agent with `publish_page`, or review and publish in the admin.

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
| [`@nextpress-org/cli`](https://www.npmjs.com/package/@nextpress-org/cli) | Self-host installer and Docker helper |

Questions or early access: **[info@nextpress.ai](mailto:info@nextpress.ai)**
