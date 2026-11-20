---
title: API key permissions
description: Every API key permission, what it allows, which presets include it, and which permission each kind of request needs.
order: 2
type: Reference
---

# API key permissions

A permission names one thing an API key may do. In error answers it is called a scope. A write permission always includes the matching read permission: `posts:write` also allows `posts:read`.

## Content permissions

Each kind of content has a read and a write permission. Write covers create, update and delete.

| Content | Read | Write | Covers |
|---|---|---|---|
| Pages | `pages:read` | `pages:write` | Pages and their blocks, form answers, page files |
| Posts | `posts:read` | `posts:write` | Blog posts and their content |
| Blogs | `blogs:read` | `blogs:write` | Blogs and blog settings |
| Templates | `templates:read` | `templates:write` | Templates and pre-designed blocks |
| Comments | `comments:read` | `comments:write` | Comments and moderation |
| Media | `media:read` | `media:write` | Uploads and the media library |
| Themes | `themes:read` | `themes:write` | Themes and which one is active |
| Plugins | `plugins:read` | `plugins:write` | Plugins |

## Other permissions

| Permission | Label in the dashboard | What it allows |
|---|---|---|
| `preview:write` | Preview links | Create time-limited preview links. Viewing a preview also needs read access to the page or post |
| `hooks:read` | View hooks | List registered hooks |
| `dashboard:read` | View dashboard stats | Read the site's summary counts |
| `settings:read` | Read settings | Read site settings, options and site details |
| `settings:write` | Edit settings | Change site settings, options and site details |
| `users:read` | Read users | Read accounts, and who has which role on the site |
| `users:write` | Manage users | Change accounts, roles and invite links |
| `sites:read` | Read sites | Read the sites of the install |
| `sites:write` | Manage sites | Create, update and delete sites |
| `system:read` | Read system info | Read release and upgrade information |
| `system:write` | System actions | Run imports and other system tools |

## Presets

| Permission | Content editor | Posts editor | Read only | Full access |
|---|---|---|---|---|
| All content read | Yes | `posts:read` only | Yes | Yes |
| All content write | Yes | `posts:write` only | No | Yes |
| `hooks:read`, `dashboard:read` | Yes | No | Yes | Yes |
| `preview:write` | Yes | Yes | No | Yes |
| `settings:read` | No | No | Yes | Yes |
| Settings, users, sites and system write | No | No | No | Yes |

## Requests that need no key, or only the dashboard

- Published content through the public API, the health check, and opening a preview link need no key.
- Opening and joining through an invite link need no key.
- API keys are created, changed and revoked in the dashboard.
- Dashboard updates and AI settings accept only a signed-in dashboard session. A key is refused there.

## Requests not listed

A request that matches no rule needs every permission. Only a **Full access** key can make it.

## Older keys

Keys made before per-content permissions may hold `content:read` or `content:write`. They still work: `content:read` allows reading all content, and `content:write` allows writing it.

## Next steps

- [API keys](/docs/developers/api-keys) to create a key.
- [SDK](/docs/developers/sdk).
- [MCP server](/docs/developers/mcp-server).
