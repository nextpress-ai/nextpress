# Page Builder

**Type:** Guide  
**Source:** `packages/sdk/src/page-builder/`, `packages/sdk/src/editor/`

Two APIs cover dashboard-style editing: **`pageBuilder`** (stateless helpers) and **`createEditorSession`** (local state + undo/redo).

## When to use which

| API | Best for |
|-----|----------|
| `pageBuilder` | One-shot scripts: create from template, save blocks, publish |
| `createEditorSession` | Interactive tools, MCP agents, multi-step edits with undo |

Both require `content:read` / `content:write` scopes as appropriate. Preview links need `preview:write`.

---

## `pageBuilder`

Factory: `nextpress.pageBuilder` (created inside `createNextpress`).

### Pages

```ts
const page = await nextpress.pageBuilder.loadPage({ id: pageId });

await nextpress.pageBuilder.savePageBlocks({
  id: page.id,
  blocks: [
    nextpress.blocks.heading({ text: "Welcome", level: 1 }),
    nextpress.blocks.paragraph({ text: "Hello world." }),
  ],
});

await nextpress.pageBuilder.publishPage({ id: page.id });

const draftPreview = await nextpress.pageBuilder.previewPage({ id: page.id });
```

| Method | Description |
|--------|-------------|
| `loadPage({ id })` | `pages.get` |
| `savePage({ id, ...input })` | Full page update |
| `savePageBlocks({ id, blocks })` | Update blocks only |
| `publishPage({ id, blocks? })` | Set status `publish` + `publishedAt` |
| `unpublishPage({ id })` | Set status `draft` |
| `previewPage({ id })` | Authenticated preview payload |
| `createPageFromTemplate({ templateId, title, slug?, status? })` | New page from template blocks |
| `applyTemplateToPage({ pageId, templateId, mode? })` | `replace` or `append` template blocks |
| `createPagePreviewLink({ id, expiresInSeconds? })` | Share URL, default 300s |

### Posts

| Method | Description |
|--------|-------------|
| `loadPost({ id })` | `posts.get` |
| `savePost({ id, ...input })` | Full post update |
| `savePostBlocks({ id, blocks })` | Update blocks only |
| `publishPost({ id, blocks? })` | Publish post |
| `previewPost({ id })` | Authenticated preview |
| `createPostPreviewLink({ id, expiresInSeconds? })` | Share URL |

### Templates

| Method | Description |
|--------|-------------|
| `loadTemplate({ id })` | `templates.get` |
| `saveTemplateBlocks({ id, blocks })` | Update template blocks |

### Utility

| Method | Description |
|--------|-------------|
| `starterLayout()` | Returns heading + paragraph starter blocks |

---

## `createEditorSession`

Factory: `nextpress.createEditorSession({ coalesceMs?: 300 })`.

### Lifecycle

```ts
const editor = nextpress.createEditorSession();

await editor.load({ type: "page", id: pageId });

editor.setBlocks([
  ...editor.getBlocks(),
  nextpress.blocks.paragraph({ text: "Added via SDK" }),
]);

editor.undo();
editor.redo();

await editor.save();
await editor.publish();

const { previewUrl, expiresAt } = await editor.createPreviewLink({
  expiresInSeconds: 300,
});
```

### Methods

| Method | Description |
|--------|-------------|
| `load({ type, id })` | Load page, post, or template; resets undo stack |
| `getBlocks()` | Current block tree |
| `setBlocks(blocks)` | Replace blocks; push undo step |
| `updateBlocks(blocks)` | Replace with coalescing (rapid edits, default 300ms window) |
| `undo()` / `redo()` | Undo stack navigation |
| `canUndo()` / `canRedo()` | Stack state |
| `save({ title?, slug?, status? })` | Persist to server |
| `publish()` | Set status publish (pages and posts only) |
| `unpublish()` | Set status draft (pages and posts only) |
| `preview()` | Authenticated preview via `preview.*` |
| `createPreviewLink({ expiresInSeconds? })` | Mint share token (default 300s) |
| `getHistory()` | Page version list (pages only) |
| `restoreVersion({ version })` | Restore page from history (pages only) |
| `getLoaded()` | Current loaded metadata or `null` |
| `blocks` | Same builder as `nextpress.blocks` |

### Content types

- `type: "page"` | `"post"` | `"template"`
- Templates cannot be published or unpublished
- Version history and restore are **pages only**

### Undo semantics

Mirrors dashboard `useUndoRedo`:

- `setBlocks` always pushes a new undo state (after coalesce window clears)
- `updateBlocks` coalesces rapid changes into one undo step
- `load` and `restoreVersion` reset the stack

---

## Example: template to published page

```ts
const page = await nextpress.pageBuilder.createPageFromTemplate({
  templateId: "template-uuid",
  title: "Landing",
  status: "draft",
});

await nextpress.pageBuilder.savePageBlocks({
  id: page.id,
  blocks: [
    ...page.blocks,
    nextpress.blocks.button({ data: { text: "Get started", url: "/signup" } }),
  ],
});

await nextpress.pageBuilder.publishPage({ id: page.id });
```

---

## Example: agent with undo

```ts
const editor = nextpress.createEditorSession({ coalesceMs: 500 });
await editor.load({ type: "page", id: pageId });

for (const block of generatedBlocks) {
  editor.updateBlocks([...editor.getBlocks(), block]);
}

if (!editor.canUndo()) {
  throw new Error("No changes to save");
}

await editor.save();
```
