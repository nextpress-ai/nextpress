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
- Optional site binding (key limited to one site)

## Permissions (scopes)

When creating a key, the admin selects permissions. Scopes are enforced server-side for Bearer requests.

### Presets

| Preset ID | Scopes | Typical use |
|-----------|--------|-------------|
| `editor` | `content:read`, `content:write`, `preview:write` | Scripts that edit content and share previews |
| `readonly` | `content:read`, `settings:read` | Reporting, read-only sync |
| `full` | All scope IDs | Full API access except key management |

### All scope IDs

| Scope | Label | Covers (SDK resources) |
|-------|-------|------------------------|
| `content:read` | Read content | pages, posts, blogs, templates, comments, media, themes, plugins, hooks, dashboard, preview GET |
| `content:write` | Edit content | Same paths, write methods |
| `preview:write` | Preview links | `preview.createShareToken`, editor `createPreviewLink` |
| `settings:read` | Read settings | settings, options, site |
| `settings:write` | Edit settings | Same paths, write methods |
| `users:read` | Read users | users |
| `users:write` | Manage users | users write/delete |
| `sites:read` | Read sites | sites list/get |
| `sites:write` | Manage sites | sites create/update/delete |
| `system:read` | Read system info | system.release |
| `system:write` | System actions | system upgrade, WordPress import |

**Write implies read:** a key with `content:write` satisfies routes that require `content:read`.

**Preview nuance:** `preview:write` alone can mint share tokens but authenticated preview GETs also need `content:read`.

### Scope denial

HTTP 403 response shape:

```json
{
  "message": "This API key does not have permission for this action",
  "code": "API_KEY_SCOPE_DENIED",
  "requiredScopes": ["content:write"]
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

1. Pass `siteId` in `createNextpress({ siteId })`.
2. Create the API key bound to that site in the dashboard.
3. The HTTP client merges `siteId` into queries via `withSiteId()` unless overridden.

Site-bound keys return 403 when the request targets a different site.

## Session development mode

For monorepo live tests, pass a custom `fetch` that sends session cookies instead of a real API key. See `packages/sdk/src/test/live/session-fetch.ts` and [Development](./development.md).

Sign-in and sign-up are not part of the SDK.

## Verify identity

```ts
const user = await nextpress.auth.me();
```

Requires any valid API key with at least one scope. Maps to `GET /api/auth/user`.
