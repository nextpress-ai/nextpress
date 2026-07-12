# @nextpress-org/sdk

Official TypeScript SDK for the [NextPress](https://github.com/nextpress-org/nextpress) CMS API.

**Full documentation:** [docs/sdk/README.md](https://github.com/nextpress-org/nextpress/blob/main/docs/sdk/README.md) (guides, architecture, resource reference, blocks, preview, development).

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

// Create a page with blocks (mutations return SdkResult — check isErr)
const createResult = await nextpress.pages.create({
  title: "About Us",
  status: "draft",
  blocks: [
    nextpress.blocks.heading({ text: "About Us", level: 1 }),
    nextpress.blocks.paragraph({ text: "We build great things." }),
  ],
});
if (createResult.isErr) throw createResult.error;
const page = createResult.value;

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

If the API rejects a call because the key lacks permission, the response is `403` with `code: "API_KEY_SCOPE_DENIED"`. Mutations return `SdkResult` — check `isErr`:

```ts
const result = await nextpress.pages.create({ title: "Draft", blocks: [] });
if (result.isErr && result.error.code === "API_KEY_SCOPE_DENIED") {
  console.error("Key needs more permissions in Settings → System → API Keys");
}
```

See [Versioning](https://github.com/nextpress-org/nextpress/blob/main/docs/sdk/versioning.md) for `expectedVersion` and conflict handling.

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

await editor.save(); // returns SdkResult — check isErr on conflict
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
| `nextpress.blocks` | all 39 dashboard block helpers + `fromName()` | n/a |

## Page settings and defaults

SDK-created pages get the same baseline shell as dashboard **Page Settings**:

- **Design:** `system-ui` font, `1200px` max width, `2rem 1rem` padding
- **Icons:** Lucide set, 24px default size

Applied automatically on `pages.create()` and `posts.create()` — no need to pass `other` unless you want overrides:

```ts
const createResult = await nextpress.pages.create({
  title: "Landing",
  slug: "landing",
  status: "draft",
  blocks: nextpress.blocks.starterLayout(),
  // optional overrides — merged with defaults:
  other: { design: { fontFamily: "Inter, sans-serif" } },
});
```

Every block built through `nextpress.blocks.*` also gets editor-native scaffolding: `20px` padding, token `units`, and registry `defaultStyles` (headings, form fields, gallery, etc.).

## Page builder workflows

Use resources for one-shot automation, or an editor session when you need undo/redo:

```ts
const createResult = await nextpress.pages.create({
  title: "Landing",
  blocks: nextpress.blocks.starterLayout(),
});
if (createResult.isErr) throw createResult.error;
const page = createResult.value;

const current = await nextpress.pages.get({ id: page.id });
const updateResult = await nextpress.pages.update({
  id: page.id,
  expectedVersion: current.version ?? 0,
  blocks: [
    nextpress.blocks.heading({ text: "Welcome", level: 1 }),
    nextpress.blocks.postList({ data: { blogId: "…", postsPerPage: 6 } }),
  ],
});
if (updateResult.isErr) throw updateResult.error;

const publishResult = await nextpress.pages.update({
  id: page.id,
  expectedVersion: updateResult.value.version ?? 0,
  status: "publish",
  publishedAt: new Date().toISOString(),
});
if (publishResult.isErr) throw publishResult.error;

const preview = await nextpress.preview.page({ id: page.id });
```

## Blocks

There is no standalone blocks API. All **39 dashboard blocks** are available via `nextpress.blocks.*` or `nextpress.blocks.fromName("core/cover")`.

### Nested settings (Content / Style / Advanced)

Prefer nested `settings` — same tabs as the dashboard:

```ts
nextpress.blocks.group({
  settings: {
    content: { tagName: "section" },
    styles: { display: "flex", gap: "16px", padding: "24px" },
    advanced: { columnLayout: undefined },
  },
  children: [nextpress.blocks.paragraph({ text: "Inside group" })],
});
```

Layout CSS on `core/group` and `core/columns` belongs in `settings.styles`, not `content`.

### Multi-column layouts

Use `columnCount` or `columnGroups` so preview/publish match the editor (sets `settings.columnLayout`):

```ts
nextpress.blocks.columns({
  columnCount: 3,
  settings: { styles: { gap: "24px" } },
  children: [
    nextpress.blocks.heading({ text: "Col 1", level: 3 }),
    nextpress.blocks.heading({ text: "Col 2", level: 3 }),
    nextpress.blocks.heading({ text: "Col 3", level: 3 }),
  ],
});

// Or explicit groups (one array per column):
nextpress.blocks.columns({
  columnGroups: [
    [nextpress.blocks.paragraph({ text: "Left" })],
    [nextpress.blocks.paragraph({ text: "Right" })],
  ],
});
```

### Form blocks

`input()`, `textarea()`, and `select()` map to `core/input`, `core/textarea`, and `core/select` with publish-safe default styles.

### Layout utilities (exported)

| Export | Use |
|--------|-----|
| `buildColumnsBlock` | Low-level columns builder |
| `buildColumnsLayout` | Distribute child ids across N columns |
| `buildGoogleSearchPageBlocks` | Demo landing layout |
| `applySdkBlockDefaults` | Apply editor shell to an existing tree |
| `normalizeBlockTree` | Fix `parentId` after manual edits |

```ts
const blocks = [
  nextpress.blocks.heading({ text: "Hello", level: 1 }),
  nextpress.blocks.container({
    children: [
      nextpress.blocks.paragraph({ text: "Content" }),
      nextpress.blocks.image({ url: "/uploads/photo.jpg", alt: "Photo" }),
    ],
  }),
  nextpress.blocks.button({
    settings: {
      content: { text: "Contact", url: "/contact", linkTarget: "_self" },
    },
  }),
];
```

## Input validation

SDK methods validate inputs with Zod before sending requests. Invalid input throws locally. **Mutations** (`create`, `update`, `delete`) return `SdkResult` — check `isErr` before using `value`. **Reads** throw `NextpressError` on API failure.

Updates require `expectedVersion` from a prior `get()`. See [Versioning](https://github.com/nextpress-org/nextpress/blob/main/docs/sdk/versioning.md).

```ts
import { isNextpressError, VERSION_STALE } from "@nextpress-org/sdk";

const result = await nextpress.posts.update({
  id: postId,
  expectedVersion: 0,
  title: "Updated",
});
if (result.isErr) {
  if (result.error.code === VERSION_STALE) {
    console.warn("Someone else edited this — reload and retry");
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
