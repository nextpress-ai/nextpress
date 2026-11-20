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
| `list(params?)` | `GET /api/pages` | pages:read |
| `get({ id })` | `GET /api/pages/:id` | pages:read |
| `create(input)` | `POST /api/pages` | pages:write |
| `update({ id, ...input })` | `PUT /api/pages/:id` | pages:write |
| `delete({ id })` | `DELETE /api/pages/:id` | pages:write |
| `getHistory({ id })` | `GET /api/pages/:id/history` | pages:read |
| `restoreVersion({ id, version })` | `POST /api/pages/:id/restore` | pages:write |
| `reorder({ items })` | `PATCH /api/pages/reorder` | pages:write |

List query params: `page`, `per_page`, `status`, `search`, `siteId` (via factory default).

Create/update accept `title`, `slug`, `status`, `blocks`, `publishedAt`, and other page fields per `CreatePageInput` / `UpdatePageInput`.

### Page order

`reorder` sets the menu order of many pages in one call. Lower `menuOrder` comes first. Up to 100 pages, all on one site (the client's site unless you pass `siteId`). It returns a result like `create` does: check `isErr`.

```ts
const result = await nextpress.pages.reorder({
  items: [
    { id: aboutId, menuOrder: 0 },
    { id: contactId, menuOrder: 1 },
  ],
});
if (result.isErr) console.error(result.error.message);
```

The server moves pages one at a time. If one page is not on the site, the call fails, and the pages listed before it have already moved.

---

## `nextpress.docs`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/docs` | pages:read |
| `create(input)` | `POST /api/docs` | pages:write |
| `tree({ homeId })` | `GET /api/docs/:homeId/tree` | pages:read |
| `treeOfPage({ pageId })` | `GET /api/docs/items/:pageId` | pages:read |
| `updateSettings({ homeId, ...changes })` | `PUT /api/docs/:homeId/settings` | pages:write |
| `addItem({ homeId, ...item })` | `POST /api/docs/:homeId/items` | pages:write |
| `updateItem({ pageId, ...changes })` | `PATCH /api/docs/items/:pageId` | pages:write |
| `reorder({ homeId, parentId, orderedIds })` | `PUT /api/docs/:homeId/order` | pages:write |
| `deleteItem({ pageId })` | `DELETE /api/docs/items/:pageId` | pages:write |
| `readPage({ pageId })` | `GET /api/docs/pages/:pageId/mdx` | pages:read |
| `writePage({ pageId, mdx, expectedVersion, ... })` | `PUT /api/docs/pages/:pageId/mdx` | pages:write |
| `exportFile({ homeId, includeFiles? })` | `GET /api/docs/:homeId/export` | pages:read |

The inputs, results, errors and an example are in [Docs](./docs.md).

---

## `nextpress.posts`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/posts` | posts:read |
| `get({ id })` | `GET /api/posts/:id` | posts:read |
| `create(input)` | `POST /api/posts` | posts:write |
| `update({ id, ...input })` | `PUT /api/posts/:id` | posts:write |
| `delete({ id })` | `DELETE /api/posts/:id` | posts:write |

`list` accepts `blogId` as an alias for `blog_id`.

---

## `nextpress.blogs`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/blogs` | blogs:read |
| `get({ id })` | `GET /api/blogs/:id` | blogs:read |
| `create(input)` | `POST /api/blogs` | blogs:write |
| `update({ id, ...input })` | `PUT /api/blogs/:id` | blogs:write |
| `delete({ id })` | `DELETE /api/blogs/:id` | blogs:write |

---

## `nextpress.comments`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/comments` | comments:read |
| `get({ id })` | `GET /api/comments/:id` | comments:read |
| `create(input)` | `POST /api/comments` | comments:write |
| `update({ id, ...input })` | `PUT /api/comments/:id` | comments:write |
| `approve({ id })` | `PATCH /api/comments/:id/approve` | comments:write |
| `spam({ id })` | `PATCH /api/comments/:id/spam` | comments:write |
| `delete({ id })` | `DELETE /api/comments/:id` | comments:write |

---

## `nextpress.media`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/media` | media:read |
| `get({ id })` | `GET /api/media/:id` | media:read |
| `upload(input)` | `POST /api/media` (multipart) | media:write |
| `update({ id, ...input })` | `PUT /api/media/:id` | media:write |
| `delete({ id })` | `DELETE /api/media/:id` | media:write |
| `copyBrandLogo({ url, title? })` | `POST /api/media/svgl` | media:write |

`upload` accepts `{ file: Blob | File, alt?, caption?, description?, siteId? }`.

### Brand logos

`copyBrandLogo` saves a logo from [svgl.app](https://svgl.app) into the site's library, so the site serves its own copy. Use the returned `url` in an image or icon block. Asking for the same logo again returns the copy already saved. `title` becomes the alt text (first 120 characters kept). The server allows 30 logos a minute per person.

Only addresses like `https://svgl.app/library/github.svg` are accepted. Anything else throws before a request is sent.

```ts
const logo = await nextpress.media.copyBrandLogo({
  url: "https://svgl.app/library/github.svg",
  title: "GitHub",
});
nextpress.blocks.image({ url: logo.url, alt: logo.alt ?? "GitHub" });
```

---

## `nextpress.templates`

| Method | HTTP | Scope |
|--------|------|-------|
| `list(params?)` | `GET /api/templates` | templates:read |
| `get({ id })` | `GET /api/templates/:id` | templates:read |
| `create(input)` | `POST /api/templates` | templates:write |
| `duplicate({ id, ...input })` | `POST /api/templates/:id/duplicate` | templates:write |
| `update({ id, ...input })` | `PUT /api/templates/:id` | templates:write |
| `delete({ id })` | `DELETE /api/templates/:id` | templates:write |
| `listParts(params?)` | `GET /api/templates?usage=part` | templates:read |
| `createPart(input)` | `POST /api/templates` (with `usage: "part"`) | templates:write |
| `usage({ id })` | `GET /api/templates/:id/usage` | templates:read |

`list` returns pre-designed blocks, which are copied into a page. Those stay global. It never includes template parts.

### Linked template parts

A template part is a header, footer or section you design once and show on many pages through a `core/template-part` block. Change the part and every page that shows it changes. Parts belong to one site.

- `listParts({ page?, per_page?, siteId? })` lists the site's parts. Each has `usedOnPages`.
- `usage({ id })` returns `{ pages: [{ id, title, status }] }`. Check it before you reshape or delete a part. Drafts count; trashed pages do not.
- `createPart({ name, blocks?, rootBlock? })` makes a part.
  - A part is exactly one layout block with anything inside it: Group, Stack, Columns, Container, Header, Accordion, Popup or Form. Loose blocks, or two blocks at the top, throw before a request is sent.
  - With no `blocks`, it starts as one empty `rootBlock` (default `core/group`).
  - Give `blocks` or `rootBlock`, not both.

```ts
const header = await nextpress.templates.createPart({ name: "Main header", rootBlock: "core/header" });
// Fill it with templates.update({ id: header.id, blocks: [...] }), then show it on a page:
// a `core/template-part` block whose content points at header.id.
const { templates } = await nextpress.templates.listParts();
```

---

## `nextpress.pageTransfer`

Move pages between sites: download a page file, then bring it into another site. Not for copying inside one site (use `pages.duplicate`).

| Method | HTTP | Scope |
|--------|------|-------|
| `links({ pageId })` | `GET /api/page-transfer/pages/:id/links` | pages:read + media:read |
| `export({ pageId, files?, include? })` | `GET /api/page-transfer/pages/:id/export` | pages:read + media:read |
| `import({ file, fileName, includeTheme?, siteId? })` | `POST /api/page-transfer/import` (multipart) | pages:write + media:write |

The key needs both the page and the media scope on every call, because a page file carries the files it uses. An API key works on one site, so moving a page between sites takes one client per site. The server allows 20 exports and 10 imports a minute per person; past that it answers `429` with a plain message.

- `links` lists the pages a page links to (and what those link to), plus `missing` links that point at no page. Use it to choose what travels along.
- `export` returns `{ bytes, fileName, contentType }`. `bytes` is a `Uint8Array`, so it works the same in Node 20+ and browsers. Pass `files: false` for a small file with no images or videos. Pass `include: [pageId, ...]` (up to 50) to bring linked pages along. With files, a page file can be tens of megabytes; raise the client's `timeout` if a big page times out.
- `import` creates a draft page from a page file. `file` can be the `bytes` from `export`, a `File` or `Blob`, or the file's JSON text. A page address that is taken on the target site gets a new one, and links to it follow. Pass `includeTheme: true` to bring the file's theme and make it the site's theme. It returns a result: check `isErr`.

```ts
const links = await source.pageTransfer.links({ pageId });
const file = await source.pageTransfer.export({
  pageId,
  files: false,
  include: links.pages.map((page) => page.id),
});
const result = await target.pageTransfer.import({ file: file.bytes, fileName: file.fileName });
if (result.isOk) console.log(result.value.page.slug, result.value.renamed);
```

The editor's paste helper (`POST /api/page-transfer/files`) is not included. It only stores the files of blocks copied and pasted inside the dashboard.

---

## `nextpress.forms`

What visitors sent through Form blocks. Form answers follow the page they were sent from, so the key needs `pages:read` to read them and `pages:write` to change them.

| Method | HTTP | Scope |
|--------|------|-------|
| `submissions.list(params?)` | `GET /api/forms/submissions` | pages:read |
| `submissions.exportCsv(params?)` | `GET /api/forms/submissions/export` | pages:read |
| `submissions.markStatus({ id, status })` | `PATCH /api/forms/submissions/:id` | pages:write |
| `submissions.delete({ id })` | `DELETE /api/forms/submissions/:id` | pages:write |

- `list({ page?, per_page?, form?, status? })`: newest first. `form` is the form's name; `status` is `"new"` or `"read"`. The answer holds `items`, `total`, `formNames` (every form with answers, for a filter), `unread`, `page`, `perPage` and `pageTitles`. Each item has `formName`, `status`, `createdAt` and `fields: [{ name, label, value }]`.
- `exportCsv({ form? })` returns the CSV as text, for one form or all of them. It is not paged.
- `markStatus` sets one answer to `"read"` or back to `"new"` and returns it.
- `delete` removes one answer for good. It returns nothing.

```ts
const { items, unread } = await nextpress.forms.submissions.list({ status: "new", form: "Contact" });
await nextpress.forms.submissions.markStatus({ id: items[0].id, status: "read" });
const csv = await nextpress.forms.submissions.exportCsv({ form: "Contact" });
```

---

## `nextpress.themes`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/themes` | themes:read |
| `getActive()` | `GET /api/themes/active` | none (public) |
| `activate({ id })` | `POST /api/themes/:id/activate` | themes:write |

`list()` returns `Theme[]` (raw array from server).

---

## `nextpress.plugins`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/plugins` | plugins:read |

Returns `Plugin[]`.

---

## `nextpress.hooks`

| Method | HTTP | Scope |
|--------|------|-------|
| `list()` | `GET /api/hooks` | hooks:read |

Debug endpoint listing registered WordPress-style hooks.

---

## `nextpress.dashboard`

| Method | HTTP | Scope |
|--------|------|-------|
| `stats()` | `GET /api/dashboard/stats` | dashboard:read |

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
| `post({ id })` | `GET /api/preview/post/:id` | posts:read |
| `page({ id })` | `GET /api/preview/page/:id` | pages:read |
| `template({ id })` | `GET /api/preview/template/:id` | templates:read |
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

Two request options matter for files:

- `body` can be a `FormData`. It is sent as it is, with no JSON content type, so `fetch` can add the multipart boundary (`media.upload` and `pageTransfer.import` use this).
- `responseType: "file"` returns `{ bytes, fileName, contentType }` instead of parsed JSON or text. Errors still become `NextpressError`. `pageTransfer.export` uses this.
