# NextPress MCP — getting started

**Type:** Guide  
**Package:** `@nextpress-org/mcp`  
**Depends on:** `@nextpress-org/sdk` (MCP 0.3 needs SDK 0.3)

## Why

Agents in Cursor or Claude can build and edit NextPress sites without replacing the CMS. Owners keep the admin UI for the same pages, posts, and media.

## Prerequisites

1. A running NextPress instance
2. An API key from **Settings → System → API Keys** (scoped; `editor` is enough for content work)
3. Node 20+

## Configure Cursor

Add to MCP settings:

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

Monorepo (before npm publish):

```json
{
  "mcpServers": {
    "nextpress": {
      "command": "node",
      "args": ["PACKAGES_MCP_DIST/index.js"],
      "env": {
        "NEXTPRESS_URL": "http://localhost:5000",
        "NEXTPRESS_API_KEY": "npk_live_…",
        "NEXTPRESS_SITE_ID": "your-site-uuid"
      }
    }
  }
}
```

Replace `PACKAGES_MCP_DIST` with the absolute path to `packages/mcp/dist` after `pnpm mcp:build`.

## Safe editing contract

| Rule | Detail |
|------|--------|
| Draft first | `create_page` / `create_post` default to `draft` |
| Versioned updates | The page-editing tools (`change_page_blocks` and friends) read the page and save with its version themselves. `update_page`, `patch_page_blocks` and `restore_page_version` take `expectedVersion` from the last read |
| Conflicts | If someone else (often the owner) saved in the meantime, nothing is overwritten. The agent is told "The page changed somewhere else. Read the outline again." (or gets `VERSION_STALE` from the older tools) and reads again |
| Checked before saving | `change_page_blocks` runs the same checks as the editor's assistant. A change that would add a problem the server would refuse is not saved, and the reply says why |
| Undo | `get_page_history` lists earlier versions; `restore_page_version` puts one back and keeps the replaced blocks in the history |
| Publish | Use `publish_page` only when asked |
| Scopes | Prefer least privilege; avoid `full` unless needed |

## How an agent should build a page

Start from the **`build_page`** prompt (optional `purpose` and `audience`). It carries the page design guide and the order that works. In Claude Code it appears as `/mcp__nextpress__build_page`. The same guide is the resource `nextpress://design-guide` and the tool `get_design_guide`.

1. **Learn the site.** `get_site_context` (theme colours, settings), `list_pages` (link only to pages that exist), `list_media` (pictures to use), `list_template_parts` (reuse a shared header or footer).
2. **Get a draft.** `create_page` with a title, then `get_page_outline` for its ids. The outline is short; `get_page` returns every block and is long.
3. **Look up blocks.** `list_block_types` says when to use each block; `get_block_type` shows the fields and an example.
4. **Build in small steps.** One section per `change_page_blocks` call (header, hero, features…). Each reply lists the new blocks with their ids. A refused change says why; send the whole call again.
5. **Check.** `check_page`, then `apply_page_phone_fixes` for phone warnings.
6. **Preview.** `preview_page` gives the owner a link without a login.
7. **Leave it as a draft.** Publish only when the owner asks.

To change one block, use the **`edit_block`** prompt (`id`, `block_id`, `request`). It tells the agent to stay inside that block.

Posts work the same way: pass the post's UUID as `id` and `content_type: "post"`.

## How an agent writes docs

Start from the `write_docs` prompt (`topic`, and an optional `audience`). It carries the docs writing guide: one idea per page, a description on every page, Steps for tasks, Tabs and code groups for alternatives, callouts for warnings, diagrams for flows, and an MDX cheat sheet with the exact syntax of every component. The same text is the resource `nextpress://docs/guide`, and the `get_docs_guide` tool returns it too.

1. Find the docs with `list_docs`. Make one with `create_docs` when the site has none.
2. Read the tree with `get_docs_tree`: every page's id and address, so links point at pages that exist.
3. Add pages and groups with `add_docs_page`. A page holds text; a group holds pages. Move, rename, hide or re-address them with `update_docs_page`, and set their order with `reorder_docs_pages`.
4. Write each page. `read_docs_page` gives its MDX and its version. `write_docs_page` saves the whole text with that version. A mistake in the MDX is refused, the reply names the line, and nothing is saved. A page that someone changed meanwhile is refused with a note to read it again.
5. Pages stay drafts. Publish with `publish_page` only when the owner asks.

## Tool list

| Group | Tools |
|-------|-------|
| Build and change a page | `get_page_outline`, `get_page_block`, `change_page_blocks`, `check_page`, `apply_page_phone_fixes` |
| Block types and guide | `list_block_types`, `get_block_type`, `get_design_guide` |
| Pages and posts | `list_pages`, `get_page`, `create_page`, `update_page`, `publish_page`, `list_posts`, `get_post`, `create_post`, `update_post`, `publish_post`, `list_blogs`, `get_blog`, `create_blog`, `preview_page`, `preview_post` |
| Undo | `get_page_history`, `restore_page_version` |
| Template parts | `list_template_parts`, `create_template_part`, `get_template_part_usage` |
| Templates and themes | `list_templates`, `get_template`, `list_themes`, `get_theme`, `create_theme`, `update_theme`, `activate_theme` |
| Media | `list_media`, `upload_media`, `copy_brand_logo` |
| Forms (read only) | `list_form_submissions` |
| Docs | `list_docs`, `create_docs`, `get_docs_tree`, `update_docs_settings`, `add_docs_page`, `update_docs_page`, `reorder_docs_pages`, `delete_docs_page`, `read_docs_page`, `write_docs_page`, `get_docs_guide` |
| Site | `get_site_context` |
| Kept for compatibility | `build_blocks`, `validate_blocks`, `patch_page_blocks`, `patch_post_blocks` |

Prompts: `build_page`, `edit_block`, `write_docs`. Resources: `nextpress://design-guide`, `nextpress://docs/guide`, `nextpress://blocks/catalog` (with a note on when to use each block), `nextpress://blocks/schema`, `nextpress://site/map`, `nextpress://site/context`.

Details and descriptions of each tool: [`packages/mcp/README.md`](../../packages/mcp/README.md).

## Relation to strategy

[`docs/ai-native-cms-strategy.md`](../ai-native-cms-strategy.md) planned Agent API → SDK → MCP. MCP v1 ships as a thin wrapper over the existing REST SDK. A dedicated Agent API (`patchBlocks`, schema registry) remains future work; MCP will stay a thin transport when that lands.
