# @nextpress-org/mcp

MCP server for [NextPress](https://github.com/nextpress-org/nextpress). Lets Cursor, Claude Desktop, and other MCP clients create and edit site content through the official SDK — while site owners keep managing the same content in the NextPress admin CMS.

## How dual ownership works

1. Mint a scoped API key in **Settings → System → API Keys** (prefer the `editor` preset).
2. Agents talk to NextPress via this MCP (Bearer key).
3. Owners open the same pages/posts in the dashboard (session login).
4. Writes use optimistic concurrency (`expectedVersion`). Agents cannot silently overwrite owner edits.

## Install / run

```bash
npx @nextpress-org/mcp
```

Or from this monorepo:

```bash
pnpm mcp:build
node packages/mcp/dist/index.js --url http://localhost:5000 --api-key npk_live_…
```

### Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXTPRESS_URL` | yes | Base URL of the NextPress instance |
| `NEXTPRESS_API_KEY` | yes | `npk_live_…` key from the dashboard |
| `NEXTPRESS_SITE_ID` | yes | Site UUID (same site chosen when minting the key) |

Flags `--url`, `--api-key`, `--site-id` override env.

## Cursor config

```json
{
  "mcpServers": {
    "nextpress": {
      "command": "npx",
      "args": ["-y", "@nextpress-org/mcp"],
      "env": {
        "NEXTPRESS_URL": "https://mysite.example",
        "NEXTPRESS_API_KEY": "npk_live_…",
        "NEXTPRESS_SITE_ID": "your-site-uuid"
      }
    }
  }
}
```

Local monorepo (no publish):

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

## Claude Desktop

Same `mcpServers` shape in `claude_desktop_config.json`.

## Tools (v1 content core)

| Tool | Purpose |
|------|---------|
| `get_site_context` | Branding, theme, settings, health |
| `list_pages` / `get_page` | Discover and load pages |
| `create_page` / `update_page` | Draft-first writes; update needs `expectedVersion` |
| `publish_page` | Explicit publish (`status: publish`) |
| `list_posts` / `get_post` / `create_post` / `update_post` | Blog posts |
| `list_templates` / `get_template` | Templates |
| `list_media` / `upload_media` | Media library (`path` or `base64`) |
| `preview_page` | Time-limited share URL |
| `list_block_types` / `build_blocks` | Block catalog + safe tree builder |
| `validate_blocks` | Dry-run registry validation |
| `patch_page_blocks` / `patch_post_blocks` | Path ops (insert/update/move/delete) — prefer over full tree replace |

## Resources

| URI | Content |
|-----|---------|
| `nextpress://blocks/catalog` | Block names/metadata |
| `nextpress://blocks/schema` | Registry schema catalog (types, child rules) |
| `nextpress://site/map` | Pages/posts slug map |
| `nextpress://site/context` | Same as `get_site_context` |

## Agent workflow

1. `get_site_context` or read `nextpress://site/context`
2. `build_blocks` → pass `blocks` into `create_page` (status defaults to `draft`)
3. `preview_page` for a share link
4. Owner reviews/edits in admin; if agent updates again, `get_page` then `update_page` with the new `expectedVersion`

On `VERSION_STALE`, re-fetch and retry — do not force overwrite.

## Tests

```bash
pnpm mcp:test                 # unit + in-memory MCP tool tests
pnpm mcp:test:integration     # live API (needs server + integration config)
```

Integration reuses the SDK package’s `integration.config.ts` when MCP’s own file is missing/disabled. Optional `NEXTPRESS_URL` overrides `baseUrl` (e.g. docker bridge IP). Same contract as `pnpm sdk:test:integration`: server must be up and past the setup wizard.
