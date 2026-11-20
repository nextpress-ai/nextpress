---
title: SDK
description: Use the TypeScript SDK to create, update and publish pages, read content, share preview links, and handle errors.
order: 3
type: Guide
---

# SDK

The SDK, `@nextpress-org/sdk`, is a TypeScript library for working with one NextPress site from your own code. It needs Node.js 20 or later and an [API key](/docs/developers/api-keys).

## 1. Install it

```bash
pnpm add @nextpress-org/sdk
```

With npm, run `npm install @nextpress-org/sdk`.

## 2. Create a client

Pass the site's address, the key, and the site ID shown with the key when you created it. The site ID is a UUID.

```ts
import { createNextpress } from "@nextpress-org/sdk";

const apiKey = process.env.NEXTPRESS_API_KEY;
if (!apiKey) throw new Error("Set NEXTPRESS_API_KEY");

export const nextpress = createNextpress({
  baseUrl: "https://cms.example.com",
  apiKey,
  siteId: "3f2b9c1e-8a4d-4c7b-9e21-5d6f7a8b9c0d",
});
```

| Option | Required | Default | What it does |
|---|---|---|---|
| `baseUrl` | Yes | None | The site's address |
| `apiKey` | Yes | None | The key, starting with `npk_live_` |
| `siteId` | Yes | None | The UUID of the key's site |
| `timeout` | No | 30000 | Milliseconds to wait for an answer |
| `fetch` | No | The built-in `fetch` | A custom fetch, for proxies or tests |

`nextpress.config` exposes `baseUrl` and `siteId`, never the key.

## 3. Create a page

Calls that change content return a result instead of throwing. Check `isErr` before you use `value`.

```ts
const created = await nextpress.pages.create({
  title: "About us",
  status: "draft",
  blocks: [
    nextpress.blocks.heading({ text: "About us", level: 1 }),
    nextpress.blocks.paragraph({ text: "We build websites for local shops." }),
  ],
});

if (created.isErr) {
  console.error(created.error.code, created.error.message);
} else {
  console.log("Created page", created.value.id);
}
```

## 4. Update and publish it

An update must carry `expectedVersion`, the page version you last read. If someone saved the page since, the update fails with the code `VERSION_STALE`. Read the page again and retry.

```ts
const page = await nextpress.pages.get({ id: "8d1c2b3a-4e5f-4a6b-9c7d-0e1f2a3b4c5d" });

const published = await nextpress.pages.update({
  id: page.id,
  expectedVersion: page.version ?? 0,
  status: "publish",
  publishedAt: new Date().toISOString(),
});

if (published.isErr) throw published.error;
```

## 5. Read content

Reads return the data and throw a `NextpressError` when the request fails.

```ts
const { posts, total } = await nextpress.posts.list({ status: "publish", per_page: 10 });

const homepage = await nextpress.public.homepage();
const about = await nextpress.public.page({ slug: "about" });
```

`per_page` can be at most 100. `nextpress.public` reads published content and sends no key.

## 6. Share a preview link

A preview link shows a draft without signing in. The key needs `preview:write` and read access to the content.

```ts
const share = await nextpress.preview.createShareToken({
  contentType: "page",
  contentId: page.id,
  expiresInSeconds: 600,
});

console.log(share.previewUrl, share.expiresAt);
```

`contentType` is `page`, `post` or `template`. Without `expiresInSeconds`, the link lasts 300 seconds. The most is 3600.

## Handle errors

```ts
import { isNextpressError } from "@nextpress-org/sdk";

const result = await nextpress.pages.create({ title: "Draft", blocks: [] });
if (result.isErr && result.error.code === "API_KEY_SCOPE_DENIED") {
  console.error("This key needs more permissions. Edit them in Settings, System, API Keys.");
}

try {
  await nextpress.pages.list({ per_page: 20 });
} catch (error) {
  if (isNextpressError(error)) console.error(error.status, error.code, error.message);
}
```

A `NextpressError` has `status`, `code` and `message`. Invalid input, such as a `siteId` that is not a UUID, throws before any request is sent.

## Blocks

`nextpress.blocks` builds blocks with the same defaults as the editor, through helpers such as `heading`, `paragraph`, `image`, `button`, `columns`, `form` and `postList`. For a block without a helper, use `fromName`, such as `nextpress.blocks.fromName("core/card")`. The list is in the [Block reference](/docs/developers/blocks-reference).

## Editing with undo

`nextpress.createEditorSession()` keeps a working copy of a page or post with `undo`, `redo`, `save`, `publish` and `createPreviewLink`. Most scripts need only `create` and `update`.

## Next steps

- [Block reference](/docs/developers/blocks-reference).
- [API key permissions](/docs/developers/api-key-permissions).
- [MCP server](/docs/developers/mcp-server).
