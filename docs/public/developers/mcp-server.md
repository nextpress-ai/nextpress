---
title: MCP server
description: Connect Cursor, Claude Desktop or Claude Code to a NextPress site so an AI agent can build and change pages through an API key.
order: 4
type: Guide
---

# MCP server

The MCP server, `@nextpress-org/mcp`, lets an AI agent in a tool such as Cursor or Claude work on one NextPress site. MCP, the Model Context Protocol, is the standard these tools use to connect to outside services. The agent works through an API key, while people keep using the admin.

## Before you start

1. A running NextPress site.
2. An [API key](/docs/developers/api-keys) for the site. The **Content editor** preset covers building pages.
3. The site ID shown with the key.
4. Node.js 20 or later on the computer where the AI tool runs.

## Connect the server

The server reads three settings:

| Setting | Flag | Value |
|---|---|---|
| `NEXTPRESS_URL` | `--url` | The site's address |
| `NEXTPRESS_API_KEY` | `--api-key` | The key, starting with `npk_live_` |
| `NEXTPRESS_SITE_ID` | `--site-id` | The UUID of the key's site |

A flag wins over the setting of the same name.

1. Open your AI tool's MCP settings. In Claude Desktop this is the file `claude_desktop_config.json`.
2. Add this entry under `mcpServers`, with your own values:

   ```json
   {
     "mcpServers": {
       "nextpress": {
         "command": "npx",
         "args": ["-y", "@nextpress-org/mcp"],
         "env": {
           "NEXTPRESS_URL": "https://cms.example.com",
           "NEXTPRESS_API_KEY": "npk_live_replace_with_your_key",
           "NEXTPRESS_SITE_ID": "3f2b9c1e-8a4d-4c7b-9e21-5d6f7a8b9c0d"
         }
       }
     }
   }
   ```

3. Restart the AI tool.

Keep the settings file out of shared projects, because it holds the key. When a setting is missing, the server stops with a message such as "Missing API key. Set NEXTPRESS_API_KEY or pass --api-key".

## Build a page with an agent

The server offers a **build_page** prompt. In Claude Code it appears as `/mcp__nextpress__build_page`. It takes an optional **purpose** and **audience**, such as "a landing page for a bakery" and "local customers on their phones". The agent then:

1. Learns the site: its name, theme colors, pages, media and shared templates.
2. Creates a draft page.
3. Adds one section per change, such as header, hero, features.
4. Fixes phone layout warnings the checks report.
5. Creates a preview link and leaves the page as a draft.

To change one block, use the **edit_block** prompt with the page, the block ID and the request. It tells the agent to touch only that block.

## What protects your content

| Safeguard | What it means |
|---|---|
| Drafts first | New pages and posts start as drafts |
| Versions | Each change carries the version the agent read. If someone saved the page since, nothing is changed and the agent reads it again |
| Checks | A change that breaks the page's rules is refused with the reason |
| History | Each save keeps the earlier blocks. `restore_page_version` puts an earlier version back |
| Permissions | The key allows only what you chose, and never more than your own role |

The prompts tell the agent to publish only when you ask. The key's permissions are what actually limit it: a key without write permissions cannot publish.

## When something goes wrong

- **The agent says the page changed elsewhere.** Someone saved it meanwhile. Nothing was overwritten. The agent reads the page again and retries.
- **A change is refused.** The reply gives the reason, such as a block that is not allowed there. Ask the agent to fix it.
- **A request fails.** The server writes one line of JSON to its error log naming the tool, the IDs and the cause. Your AI tool shows this log for the server.

## Next steps

- [MCP tools reference](/docs/developers/mcp-tools-reference).
- [Block reference](/docs/developers/blocks-reference).
- [API key permissions](/docs/developers/api-key-permissions).
