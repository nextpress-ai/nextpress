# Resources Reference

**Type:** Reference  
**Source:** `packages/sdk/src/resources/`

All methods validate inputs with Zod unless noted. HTTP methods and paths match the server routes mounted in `server/routes/index.ts`.

Scope column refers to required API key permissions. See [Authentication](./authentication.md).

---

## `nextpress.auth`

| Method | HTTP | Scope |
|--------|------|-------|
| `me()` | `GET /api/auth/user` | any valid key |

---

## `nextpress.pages`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/pages` | content:read |
| `get({ id })` | `GET /api/pages/:id` | content:read |
| `create(input)` | `POST /api/pages` | content:write |
| `update({ id, ...input })` | `PUT /api/pages/:id` | content:write |
| `delete({ id })` | `DELETE /api/pages/:id` | content:write |
| `getHistory({ id })` | `GET /api/pages/:id/history` | content:read |
| `restoreVersion({ id, version })` | `POST /api/pages/:id/restore` | content:write |

List query params: `page`, `per_page`, `status`, `search`, `siteId` (via factory default).

Create/update accept `title`, `slug`, `status`, `blocks`, `publishedAt`, and other page fields per `CreatePageInput` / `UpdatePageInput`.

---

## `nextpress.posts`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/posts` | content:read |
| `get({ id })` | `GET /api/posts/:id` | content:read |
| `create(input)` | `POST /api/posts` | content:write |
| `update({ id, ...input })` | `PUT /api/posts/:id` | content:write |
| `delete({ id })` | `DELETE /api/posts/:id` | content:write |

`list` accepts `blogId` as an alias for `blog_id`.

---

## `nextpress.blogs`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/blogs` | content:read |
| `get({ id })` | `GET /api/blogs/:id` | content:read |
| `create(input)` | `POST /api/blogs` | content:write |
| `update({ id, ...input })` | `PUT /api/blogs/:id` | content:write |
| `delete({ id })` | `DELETE /api/blogs/:id` | content:write |

---

## `nextpress.comments`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/comments` | content:read |
| `get({ id })` | `GET /api/comments/:id` | content:read |
| `create(input)` | `POST /api/comments` | content:write |
| `update({ id, ...input })` | `PUT /api/comments/:id` | content:write |
| `approve({ id })` | `PATCH /api/comments/:id/approve` | content:write |
| `spam({ id })` | `PATCH /api/comments/:id/spam` | content:write |
| `delete({ id })` | `DELETE /api/comments/:id` | content:write |

---

## `nextpress.media`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/media` | content:read |
| `get({ id })` | `GET /api/media/:id` | content:read |
| `upload(input)` | `POST /api/media` (multipart) | content:write |
| `update({ id, ...input })` | `PUT /api/media/:id` | content:write |
| `delete({ id })` | `DELETE /api/media/:id` | content:write |

`upload` accepts `{ file: Blob | File, alt?, caption?, description?, siteId? }`.

---

## `nextpress.templates`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/templates` | content:read |
| `get({ id })` | `GET /api/templates/:id` | content:read |
| `create(input)` | `POST /api/templates` | content:write |
| `duplicate({ id, ...input })` | `POST /api/templates/:id/duplicate` | content:write |
| `update({ id, ...input })` | `PUT /api/templates/:id` | content:write |
| `delete({ id })` | `DELETE /api/templates/:id` | content:write |

---

## `nextpress.themes`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/themes` | content:read |
| `getActive()` | `GET /api/themes/active` | none (public) |
| `activate({ id })` | `POST /api/themes/:id/activate` | content:write |

`list()` returns `Theme[]` (raw array from server).

---

## `nextpress.plugins`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/plugins` | content:read |

Returns `Plugin[]`.

---

## `nextpress.hooks`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/hooks` | content:read |

Debug endpoint listing registered WordPress-style hooks.

---

## `nextpress.dashboard`

| Method | HTTP | Scope |
|--------|------|-------|
| `stats()` | `GET /api/dashboard/stats` | content:read |

Returns post, page, comment, and user counts for the scoped site.

---

## `nextpress.users`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/users` | users:read |
| `get({ id })` | `GET /api/users/:id` | users:read |
| `create(input)` | `POST /api/users` | users:write |
| `update({ id, ...input })` | `PUT /api/users/:id` | users:write |
| `delete({ id })` | `DELETE /api/users/:id` | users:write |

---

## `nextpress.sites`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/sites` | sites:read |
| `get({ id })` | `GET /api/sites/:id` | sites:read |
| `create(input)` | `POST /api/sites` | sites:write |
| `update({ id, ...input })` | `PATCH /api/sites/:id` | sites:write |
| `delete({ id })` | `DELETE /api/sites/:id` | sites:write |

Returns `{ sites, total }` or `{ site }` wrappers per server shape.

---

## `nextpress.site`

Site branding (logo, favicon, active theme).

| Method | HTTP | Scope |
|--------|------|-------|
| `get()` | `GET /api/site` | settings:read |
| `update(input)` | `PATCH /api/site` | settings:write |

Returns `ApiEnvelope<SiteInfo>`.

---

## `nextpress.settings`

| Method | HTTP | Scope |
|--------|------|-------|
| `get()` | `GET /api/settings` | settings:read |
| `update(input)` | `PATCH /api/settings` | settings:write |

Partial update via `PartialSettingsInput` (General, Writing, Reading, Discussion, System tabs).

---

## `nextpress.options`

WordPress-style key/value options.

| Method | HTTP | Scope |
|--------|------|-------|
| `get({ name })` | `GET /api/options/:name` | settings:read |
| `set(input)` | `POST /api/options` | settings:write |

---

## `nextpress.preview`

See [Preview](./preview.md) for share-link workflows.

| Method | HTTP | Scope |
|--------|------|-------|
| `post({ id })` | `GET /api/preview/post/:id` | content:read |
| `page({ id })` | `GET /api/preview/page/:id` | content:read |
| `template({ id })` | `GET /api/preview/template/:id` | content:read |
| `createShareToken(input)` | `POST /api/preview/tokens` | preview:write |
| `getShared({ contentType, id, token })` | `GET /api/preview/shared/:type/:id?token=` | none (`auth: false`) |
| `buildSharePreviewUrl(...)` | — | local URL helper |

---

## `nextpress.public`

No authentication required.

| Method | HTTP |
|--------|------|
| `page({ slug })` | `GET /api/public/page/:slug` |
| `post({ slug })` | `GET /api/public/post/:slug` |
| `homepage()` | `GET /api/public/homepage` |

Slugs are URL-encoded. Only published content is returned.

---

## `nextpress.import`

WordPress import (Tools → Import WordPress in dashboard).

| Method | HTTP | Scope |
|--------|------|-------|
| `discover(input)` | `POST /api/import/wordpress/discover` | system:write |
| `listPosts(params)` | `GET /api/import/wordpress/posts` | system:read |
| `importPosts(input)` | `POST /api/import/wordpress/posts` | system:write |
| `listPages(params)` | `GET /api/import/wordpress/pages` | system:read |
| `importPages(input)` | `POST /api/import/wordpress/pages` | system:write |
| `status(params)` | `GET /api/import/wordpress/status` | system:read |

---

## `nextpress.system`

| Method | HTTP | Scope |
|--------|------|-------|
| `release()` | `GET /api/system/release` | system:read |
| `checkUpgrade()` | `POST /api/system/upgrade/check` | system:write |
| `runUpgrade()` | `POST /api/system/upgrade/run` | system:write |

---

## `nextpress.health`

Setup and health checks. No API key scopes on most routes.

| Method | HTTP |
|--------|------|
| `check()` | `GET /api/health` |
| `setupStatus()` | `GET /api/setup/status` |
| `verifyDomain({ q })` | `GET /api/setup/verify-domain?q=` |
| `setup(input)` | `POST /api/setup` |

Used for first-time install automation, not day-to-day CMS operations.

---

## `nextpress.pageBuilder`

High-level page builder workflows. See [Page builder](./page-builder.md).

All methods delegate to `pages`, `posts`, `templates`, or `preview` resources.

---

## `nextpress.blocks`

Local block tree builder. No HTTP. See [Blocks](./blocks.md).

---

## `nextpress.createEditorSession()`

Stateful editor factory. See [Page builder](./page-builder.md).

---

## `nextpress.http`

Low-level HTTP client for custom endpoints:

```ts
await nextpress.http.request("/api/custom", { method: "GET", query: { foo: "bar" } });
```

Prefer resource methods when available. Unmapped `/api/*` paths require full key scopes on the server.
