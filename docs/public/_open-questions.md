---
title: Open questions
description: Facts the code alone cannot settle, and topics left out of the public docs on purpose.
order: 99
type: Reference
---

# Open questions

The items below need a decision from the owner, or a check on a running install, before they are documented.

## Not settled by the code

- **Template field in Page settings.** **Page settings** has a **Template** list, and the choice is saved with the page. No part of page rendering reads it, so its effect on the live page is unclear. The docs list the other fields and leave this one out.
- **Pre-designed blocks across sites.** Linked templates belong to one site. Pre-designed blocks have no site of their own in the database, which suggests every site in an install shares them. Confirm before the docs say so.
- **Local AI services on a Docker install.** The presets **Ollama on this server** and **LM Studio on this server** use `localhost`. On a Docker install, `localhost` inside the app may not reach a service running on the host. Confirm on a real server before the docs give advice.
- **Certificate timing.** How long Caddy takes to get a certificate depends on the certificate service, not on NextPress. The docs give no time.

## Left out on purpose

- **Blog and docs editors.** Both now use the standard block editor with Markdown shortcuts and slash commands. The docs cover creating a blog, a post and a docs site, but do not yet go deep on editor features; the MCP docs tools are still listed by name only.
- **Plugins screen.** Plugins can be added and removed. Switching one on is not offered yet, because no plugin code is loaded.
- **Restoring a database backup.** `nextpress restore <file>` now replaces the database from a `.sql` backup. It writes a backup of the current data first.
- **Template variables and display rules.** Listed as experimental in the README and not confirmed in the editor.
