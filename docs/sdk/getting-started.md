# Getting Started

**Type:** Guide  
**Package:** `@nextpress-org/sdk` v0.1.0

## Prerequisites

- Node.js 20 or later
- A running NextPress instance (local dev server or deployed)
- An API key from **Settings → System → API Keys**

## Install

```bash
pnpm add @nextpress-org/sdk
# or
npm install @nextpress-org/sdk
```

In the monorepo, the package lives at `packages/sdk/`. Use root scripts (`pnpm sdk:build`, `pnpm sdk:test`) for development.

## Create a client

```ts
import { createNextpress } from "@nextpress-org/sdk";

const nextpress = createNextpress({
  baseUrl: "https://cms.example.com",
  apiKey: process.env.NEXPRESS_API_KEY!,
  siteId: "your-site-uuid", // optional but recommended for multi-site
});
```

### Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `baseUrl` | yes | — | NextPress instance URL, no trailing slash required |
| `apiKey` | yes | — | `npk_live_…` key from the dashboard |
| `siteId` | no | — | Default site UUID merged into scoped requests |
| `fetch` | no | `globalThis.fetch` | Custom fetch (cookies, proxies, mocks) |
| `timeout` | no | `30000` | Request timeout in milliseconds |

The public `nextpress.config` exposes only `baseUrl` and `siteId`. The API key is never included in `config` (see [Authentication](./authentication.md)).

## First calls

### List published posts

```ts
const { posts, total } = await nextpress.posts.list({
  status: "publish",
  per_page: 10,
});
```

### Create a draft page with blocks

```ts
const page = await nextpress.pages.create({
  title: "About Us",
  status: "draft",
  blocks: [
    nextpress.blocks.heading({ text: "About Us", level: 1 }),
    nextpress.blocks.paragraph({ text: "We build great things." }),
  ],
});
```

### Read public content (no special scope)

```ts
const homepage = await nextpress.public.homepage();
const about = await nextpress.public.page({ slug: "about" });
```

## Multi-site installs

Pass `siteId` in factory options. The HTTP client merges it into query parameters on list/read endpoints unless overridden per call.

Site-bound API keys reject requests when the requested `siteId` does not match the key's site. Use the same site ID in the SDK and when creating the key.

## Next steps

- [Authentication](./authentication.md): scopes, presets, permission errors
- [Page builder](./page-builder.md): save, publish, undo/redo
- [Resources](./resources.md): full method reference
- [Blocks](./blocks.md): all block helpers
