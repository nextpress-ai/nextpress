# Preview

**Type:** Guide  
**Source:** `packages/sdk/src/resources/preview.ts`

Two preview modes: **authenticated** (API key or session) and **share links** (expiring token, no login).

## Authenticated preview

Fetch draft or non-public content when you have `content:read`:

```ts
const page = await nextpress.preview.page({ id: pageId });
const post = await nextpress.preview.post({ id: postId });
const template = await nextpress.preview.template({ id: templateId });
```

HTTP paths:

- `GET /api/preview/page/:id`
- `GET /api/preview/post/:id`
- `GET /api/preview/template/:id`

Same payloads used by the dashboard preview pane. Server enforces content access and site scoping.

Via editor session:

```ts
await editor.load({ type: "page", id: pageId });
const payload = await editor.preview();
```

Or call preview directly:

```ts
await nextpress.preview.page({ id: pageId });
```

---

## Share preview links

Create a time-limited URL anyone can open without signing in.

### Requirements

- API key scope: `preview:write`
- Viewing shared content uses the public share endpoint (no auth header)

### Create a link

```ts
const { token, previewUrl, expiresAt } = await nextpress.preview.createShareToken({
  contentType: "page",
  contentId: pageId,
  expiresInSeconds: 300, // default 300 (5 minutes)
  siteId: "optional-override",
});
```

HTTP: `POST /api/preview/tokens`

Response includes:

- `token` — `npt_…` prefix
- `previewUrl` — full browser URL (built client-side if server omits it)
- `expiresAt` — ISO timestamp

### URL format

```
{baseUrl}/preview/{contentType}/{contentId}?token={token}
```

Helper:

```ts
nextpress.preview.buildSharePreviewUrl({
  contentType: "page",
  contentId: pageId,
  token,
});
```

### Fetch shared content (headless)

```ts
const page = await nextpress.preview.getShared({
  contentType: "page",
  id: pageId,
  token,
});
```

HTTP: `GET /api/preview/shared/:type/:id?token=` with `auth: false`.

Token must start with `npt_`. Server validates hash, expiry, and content match.

---

## Editor and preview shortcuts

```ts
// Editor session
const { previewUrl, expiresAt } = await editor.createPreviewLink({ expiresInSeconds: 600 });

// Direct resource call
await nextpress.preview.createShareToken({
  contentType: "page",
  contentId: pageId,
  expiresInSeconds: 600,
});
```

---

## Rate limits

Public share fetches (`/api/preview/shared`) are rate limited on the server (60 requests per minute per IP). Minting tokens requires authentication and content access.

---

## Scope summary

| Action | Scope |
|--------|-------|
| Authenticated preview GET | Matching resource read (`pages:read`, `posts:read`, `templates:read`) |
| Create share token | `preview:write` |
| Open share URL in browser | none |
| `getShared` in SDK | none |

Minting tokens with only `preview:write` works, but authenticated preview GETs need read access for the content type. The **Posts editor** preset includes both for posts.
