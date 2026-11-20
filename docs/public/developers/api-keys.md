---
title: API keys
description: Create an API key for one site, choose its permissions, change them later, revoke a key, and handle a refused request.
order: 1
type: Guide
---

# API keys

An API key lets a script, the SDK or an AI agent work on one site. Each key:

- Belongs to one site and is refused on any other.
- Can do only what its permissions allow.
- Acts as the person who made it, so it never does more than that person's role allows.
- Expires. The longest life is 1 year.

People sign in to the admin with their own accounts. Visitors need no key to read published pages.

## Create a key

You need the admin or owner role on the site.

1. Open **Settings** in the sidebar, then the **System** tab.
2. Under **API Keys**, press **Create API key**.
3. In **Name**, type a name you will recognise, such as "Production deploy".
4. In **Site**, choose the site. The key works only there.
5. In **Expires after**, pick **30 days**, **90 days**, **6 months** or **1 year**. **1 year** is chosen at first.
6. Pick a permission preset, or tick permissions one by one. **Content editor** is chosen at first. Ticking a write permission also ticks its read permission.
7. Press **Create key**.
8. In **Copy your new API key**, copy the **API key** and the **Site ID**. Both are shown only this once.
9. Press **Done**.

The key starts with `npk_live_`. Store it in a password manager or secrets store, never in code you share. If you lose it, create a new key.

Each person can have up to 25 active keys.

## Presets

| Preset | What it allows |
|---|---|
| **Content editor** | Read and edit pages, posts, blogs, templates, comments, media, themes and plugins, and create preview links |
| **Posts editor** | Read and edit posts, and create preview links |
| **Read only** | Read all content and the site's settings |
| **Full access** | Every permission. Revoking keys stays in the dashboard |

The full list is in [API key permissions](/docs/developers/api-key-permissions).

## Change a key's permissions

1. Find the key under **API Keys**.
2. Press **Edit permissions**.
3. Pick a preset or tick permissions.
4. Press **Save permissions**. The change applies at once.

An expired key shows **Expired** and cannot be edited.

## Revoke a key

Press **Revoke** on the key. It stops working at once, with no confirmation step. Give the script or agent a new key.

## When a request is refused

| Answer | Meaning | What to do |
|---|---|---|
| Code `API_KEY_SCOPE_DENIED`, with `requiredScopes` | The key lacks a permission | Add the permissions named in `requiredScopes` with **Edit permissions** |
| "This API key cannot access the requested site" | The request named another site | Use the key's own site, or a key for that site |
| "This API key is not bound to a site" | The key has no site | Create a new key |

A request can also be refused when the person who made the key no longer has the role it needs on the site.

## Next steps

- [API key permissions](/docs/developers/api-key-permissions).
- [SDK](/docs/developers/sdk) to use a key in code.
- [MCP server](/docs/developers/mcp-server) to connect an AI agent.
