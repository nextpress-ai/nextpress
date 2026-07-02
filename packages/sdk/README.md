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
  siteId: "optional-site-uuid",
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
| Content editor | Read and edit pages, posts, media, templates, and create preview links |
| Read only | View content and settings without making changes |
| Full access | All API permissions (key management stays dashboard-only) |

Write permissions include read (a key with `content:write` can also read content). Preview share links need **Preview links**; viewing authenticated previews also needs **Read content**.

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

For local development before you have a key, use a custom `fetch` with session cookies in live tests (`packages/sdk/src/test/live/`). Sign-in and sign-up stay in the dashboard, not the SDK.

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

## Resources

| Namespace | Methods | Scope (read / write) |
|-----------|---------|----------------------|
| `nextpress.pageBuilder` | `loadPage`, `savePage`, `savePageBlocks`, `publishPage`, `previewPage`, … | content |
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

Use `nextpress.pageBuilder` for dashboard-parity save/publish flows:

```ts
const page = await nextpress.pageBuilder.createPageFromTemplate({
  templateId: "…",
  title: "Landing",
});

await nextpress.pageBuilder.savePageBlocks({
  id: page.id,
  blocks: [
    nextpress.blocks.heading({ text: "Welcome", level: 1 }),
    nextpress.blocks.postList({ data: { blogId: "…", postsPerPage: 6 } }),
  ],
});

await nextpress.pageBuilder.publishPage({ id: page.id });
const preview = await nextpress.pageBuilder.previewPage({ id: page.id });
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
pnpm sdk:test          # or: bun vitest run
pnpm test:live         # requires dev server + LIVE_TEST=1
pnpm lint              # biome check
```

## License

MIT
