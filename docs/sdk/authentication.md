# Authentication

**Type:** Guide / Reference

## API keys

Keys are created and revoked in the dashboard only: **Settings → System → API Keys**.

The SDK sends the key on every authenticated request:

```http
Authorization: Bearer npk_live_…
```

The SDK **does not** expose methods to create, list, or revoke keys. That requires a dashboard session cookie.

### Key format

- Prefix: `npk_live_`
- Shown in full once at creation; only a hash is stored server-side
- Optional expiry (default 1 year in dashboard)
- Bound to one site (required when creating the key)

## Permissions (scopes)

When creating a key, the admin selects permissions. You can change them later from the same screen. Scopes are enforced server-side for Bearer requests.

### Presets

| Preset ID | Scopes | Typical use |
|-----------|--------|-------------|
| `editor` | All content read/write, hooks, dashboard, preview | Full content automation |
| `posts-editor` | `posts:read`, `posts:write`, `preview:write` | Blog-only scripts |
| `readonly` | All content read, `settings:read` | Reporting, read-only sync |
| `full` | All catalog scopes | Full API access except key management |

### Content scopes (per resource)

Each content type has separate read and write permissions:

| Resource | Read scope | Write scope |
|----------|------------|-------------|
| Pages | `pages:read` | `pages:write` |
| Posts | `posts:read` | `posts:write` |
| Blogs | `blogs:read` | `blogs:write` |
| Templates | `templates:read` | `templates:write` |
| Comments | `comments:read` | `comments:write` |
| Media | `media:read` | `media:write` |
| Themes | `themes:read` | `themes:write` |
| Plugins | `plugins:read` | `plugins:write` |
| Hooks | `hooks:read` | (read only) |
| Dashboard stats | `dashboard:read` | (read only) |
| Preview links | | `preview:write` |

### Other scopes

| Scope | Label | Covers |
|-------|-------|--------|
| `settings:read` | Read settings | settings, options, site |
| `settings:write` | Edit settings | Same paths, write methods |
| `users:read` | Read users | users |
| `users:write` | Manage users | users write/delete |
| `sites:read` | Read sites | sites list/get |
| `sites:write` | Manage sites | sites create/update/delete |
| `system:read` | Read system info | system.release |
| `system:write` | System actions | system upgrade, WordPress import |

**Write implies read:** a key with `posts:write` satisfies routes that require `posts:read`.

**Preview nuance:** `preview:write` mints share tokens. Authenticated preview GETs need read access for the matching type (`pages:read`, `posts:read`, or `templates:read`).

**Legacy keys:** older keys with `content:read` / `content:write` still work and expand to all content resource scopes at check time.

### Scope denial

HTTP 403 response shape:

```json
{
  "message": "This API key does not have permission for this action",
  "code": "API_KEY_SCOPE_DENIED",
  "requiredScopes": ["pages:write"]
}
```

SDK handling:

```ts
import { isNextpressError } from "@nextpress-org/sdk";

try {
  await nextpress.pages.create({ title: "Draft", blocks: [] });
} catch (error) {
  if (isNextpressError(error) && error.code === "API_KEY_SCOPE_DENIED") {
    // Add permissions in Settings → System → API Keys
  }
}
```

### Routes without scope checks

Public endpoints (`public.*`, `health.check`, setup) and Better Auth routes do not require scopes. Dashboard key management requires a session cookie, not a Bearer key.

Unmapped `/api/*` routes require **full access** (fail closed on the server).

## Multi-site

Every API key belongs to one site. When you create a key in the dashboard, choose the site first.

1. Create the API key for that site in **Settings → System → API Keys**.
2. Pass the same `siteId` in `createNextpress({ siteId })`.
3. The HTTP client merges `siteId` into queries via `withSiteId()` unless overridden per call.

Keys return 403 when the request targets a different site.

Sign-in and sign-up are not part of the SDK. Use dashboard API keys for all SDK authentication.

## Verify identity

```ts
const user = await nextpress.auth.me();
```

Requires any valid API key with at least one scope. Maps to `GET /api/auth/user`.
