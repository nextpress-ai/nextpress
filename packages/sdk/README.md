# @nextpress-org/sdk

Official TypeScript SDK for the [NextPress](https://github.com/nextpress-org/nextpress) CMS API.

**Full documentation:** [docs/sdk/README.md](../../docs/sdk/README.md) (guides, architecture, resource reference, blocks, preview, development).

## Install

```bash
pnpm add @nextpress-org/sdk
# or
npm install @nextpress-org/sdk
```

## Quick start

Create an API key in **Settings → System → API Keys** (shown once), then:

```ts
import { createNextpress } from "@nextpress-org/sdk";

const nextpress = createNextpress({
  baseUrl: "https://cms.example.com",
  apiKey: process.env.NEXPRESS_API_KEY!,
  siteId: "your-site-uuid",
});

// Create a page with blocks
const page = await nextpress.pages.create({
  title: "About Us",
  status: "draft",
  blocks: [
    nextpress.blocks.heading({ text: "About Us", level: 1 }),
    nextpress.blocks.paragraph({ text: "We build great things." }),
  ],
});

// List published posts
const { posts, total } = await nextpress.posts.list({
  status: "publish",
  per_page: 10,
});
```

## Authentication

The SDK sends your API key as a Bearer token on every request:

```
Authorization: Bearer npk_live_…
```

**Keys are created and revoked in the dashboard only** (Settings → System → API Keys). The SDK consumes keys; it does not mint them.

### Permissions (scopes)

When you create a key in the dashboard, you choose what it can do. Common presets:

| Preset | What it can do |
|--------|----------------|
| Content editor | Read and edit all content types, plus preview links |
| Posts editor | Create and edit blog posts, plus preview links |
| Read only | View content and settings without making changes |
| Full access | All API permissions (key management stays dashboard-only) |

Write permissions include read for the same resource (`posts:write` includes `posts:read`). Preview share links need **Preview links**; viewing authenticated previews needs read access for that content type (for example `pages:read` for page previews).

If the API rejects a call because the key lacks permission, the response is `403` with `code: "API_KEY_SCOPE_DENIED"` and a `requiredScopes` list. The SDK surfaces this on `NextpressError.code`:

```ts
import { createNextpress, isNextpressError } from "@nextpress-org/sdk";

try {
  await nextpress.pages.create({ title: "Draft", blocks: [] });
} catch (error) {
  if (isNextpressError(error) && error.code === "API_KEY_SCOPE_DENIED") {
    console.error("Key needs more permissions in Settings → System → API Keys");
  }
}
```

Site-bound keys only work for the site you selected when creating the key. Pass the same `siteId` in the SDK factory options.

## Editor session (undo/redo, publish, preview links)

For programmatic page builder workflows, use a stateful editor session:

```ts
const editor = nextpress.createEditorSession();
await editor.load({ type: "page", id: page.id });

editor.setBlocks([
  ...editor.getBlocks(),
  nextpress.blocks.paragraph({ text: "Added via SDK" }),
]);

editor.undo(); // same semantics as dashboard Cmd+Z
editor.redo();

await editor.save();
await editor.publish();

// Shareable preview — no login required, expires in 5 minutes by default
const { previewUrl, expiresAt } = await editor.createPreviewLink({ expiresInSeconds: 300 });
```

Restore a saved page version from server history:

```ts
const { history } = await editor.getHistory();
await editor.restoreVersion({ version: history[0].version });
```

## One way to work with content

| Goal | Use |
|------|-----|
| Scripts, CI, batch jobs | `nextpress.pages`, `nextpress.posts`, `nextpress.templates`, `nextpress.preview` |
| Interactive editing with undo/redo | `nextpress.createEditorSession()` |
| Read published site content | `nextpress.public.*` (by slug) |
| Read draft content (authenticated) | `nextpress.preview.*` (by id) |

Publish and unpublish go through `update({ status })` on resources, or `editor.publish()` / `editor.unpublish()` in a session.

## Events

Subscribe to typed lifecycle hooks on the client:

```ts
nextpress.on("page-created", ({ page }) => {
  page.set({ title: `${page.title} (copy)` });
});

// Side effect only — never call page.set
nextpress.on("page-created", ({ page }) => {
  console.log(`New page: ${page.slug}`);
});

nextpress.on("post-saved", ({ post, action }) => {
  post.set((current) => ({ title: `${current.title} [${action}]` }));
});

const editor = nextpress.createEditorSession();
await editor.load({ type: "page", id: pageId });

nextpress.on("editor-saved", ({ data }) => {
  data.set({ title: "Auto-named page" });
});
```

Common events: `post-saved`, `page-saved`, `post-published`, `page-published`, `preview-link-created`, `editor-loaded`, `editor-saved`.

Unsubscribe with the function returned from `on`, or call `nextpress.off("post-saved", handler)`.

Every subject entity (`page`, `post`, `data`, …) has its own `.set()`. Call `page.set(...)` to mutate that entity for later handlers and for the resource return value. Skip `.set` when you only need a side effect.

Need to change something else? Call the SDK directly in the handler — events only reshape the subject of that event, not unrelated resources:

```ts
nextpress.on("page-created", async ({ page }) => {
  page.set({ title: "Landing" });
  await nextpress.posts.create({ title: "Launch post", blogId: "…" });
});
```

## Resources

| Namespace | Methods | Scope (read / write) |
|-----------|---------|----------------------|
| `nextpress.createEditorSession()` | `load`, `save`, `publish`, undo/redo, preview links | content |
| `nextpress.posts` | `list`, `get`, `create`, `update`, `delete` | content |
| `nextpress.pages` | `list`, `get`, `create`, `update`, `delete`, history/restore | content |
| `nextpress.blogs` | `list`, `get`, `create`, `update`, `delete` | content |
| `nextpress.comments` | `list`, `get`, `create`, `update`, `approve`, `spam`, `delete` | content |
| `nextpress.media` | `list`, `get`, `upload`, `update`, `delete` | content |
| `nextpress.users` | `list`, `get`, `create`, `update`, `delete` | users |
| `nextpress.sites` | `list`, `get`, `create`, `update`, `delete` | sites |
| `nextpress.site` | `get`, `update` | settings |
| `nextpress.settings` | `get`, `update` | settings |
| `nextpress.options` | `get`, `set` | settings |
| `nextpress.templates` | `list`, `get`, `create`, `duplicate`, `update`, `delete` | content |
| `nextpress.themes` | `list`, `getActive`, `activate` | content |
| `nextpress.plugins` | `list` | content |
| `nextpress.hooks` | `list` | content |
| `nextpress.dashboard` | `stats` | content |
| `nextpress.preview` | `post`, `page`, `template` | content (read); share tokens need preview:write |
| `nextpress.public` | `page`, `post`, `homepage` | none |
| `nextpress.import` | WordPress import helpers | system |
| `nextpress.system` | `release`, `checkUpgrade`, `runUpgrade` | system |
| `nextpress.health` | `check`, `setupStatus`, `verifyDomain`, `setup` | none |
| `nextpress.auth` | `me` | any valid key |
| `nextpress.blocks` | all 35 dashboard block helpers + `fromName()` | n/a |

## Page builder workflows

Use resources for one-shot automation, or an editor session when you need undo/redo:

```ts
const page = await nextpress.pages.create({
  title: "Landing",
  blocks: nextpress.blocks.starterLayout(),
});

await nextpress.pages.update({
  id: page.id,
  blocks: [
    nextpress.blocks.heading({ text: "Welcome", level: 1 }),
    nextpress.blocks.postList({ data: { blogId: "…", postsPerPage: 6 } }),
  ],
});

await nextpress.pages.update({
  id: page.id,
  status: "publish",
  publishedAt: new Date().toISOString(),
});

const preview = await nextpress.preview.page({ id: page.id });
```

## Blocks

There is no standalone blocks API. All **35 dashboard blocks** are available via `nextpress.blocks.*` or `nextpress.blocks.fromName("core/cover")`.

```ts
const blocks = [
  nextpress.blocks.heading({ text: "Hello", level: 1 }),
  nextpress.blocks.container({
    children: [
      nextpress.blocks.paragraph({ text: "Left column content" }),
      nextpress.blocks.image({ url: "/uploads/photo.jpg", alt: "Photo" }),
    ],
  }),
  nextpress.blocks.button({ data: { text: "Click me", url: "/contact" } }),
];

await nextpress.pages.update({
  id: page.id,
  blocks,
});
```

## Input validation

All SDK methods validate inputs with Zod before sending requests. Invalid input throws a descriptive `Error` locally. API errors throw `NextpressError` with `status`, `code`, and `body`.

```ts
import { isNextpressError } from "@nextpress-org/sdk";

try {
  await nextpress.posts.create({ title: "Missing blogId" });
} catch (error) {
  if (isNextpressError(error)) {
    console.error(error.status, error.message);
  }
}
```

## Multi-site

Pass `siteId` in the factory options to scope all requests, or override per call via query/body params where supported.

## Development

From the monorepo root:

```bash
pnpm sdk:install   # install sdk deps
pnpm sdk:build     # tsup build
pnpm sdk:test      # vitest (all unit + integration + security + performance)
pnpm sdk:lint      # biome check
pnpm sdk:lint:fix  # biome check --write
```

From `packages/sdk`:

```bash
pnpm install
pnpm build
pnpm test              # unit tests only (no network)
pnpm test:integration  # real server; set src/test/integration/integration.config.ts first
pnpm lint              # biome check
```

## License

MIT
