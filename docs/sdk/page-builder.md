# Page Builder

**Type:** Guide  
**Source:** `packages/sdk/src/editor/`, `packages/sdk/src/resources/`

## One way to edit content

| Goal | Use |
|------|-----|
| Scripts, CI, one-shot automation | `nextpress.pages`, `nextpress.posts`, `nextpress.templates`, `nextpress.preview` |
| Interactive editing with undo/redo | `nextpress.createEditorSession()` |

There is no separate page-builder namespace on the client. Use resource methods directly, or an editor session when you need local state.

---

## Resource workflows

### Create and publish a page

```ts
const page = await nextpress.pages.create({
  title: "Landing",
  status: "draft",
  blocks: nextpress.blocks.starterLayout(),
});

await nextpress.pages.update({
  id: page.id,
  blocks: [
    nextpress.blocks.heading({ text: "Welcome", level: 1 }),
    nextpress.blocks.paragraph({ text: "Hello world." }),
  ],
});

await nextpress.pages.update({
  id: page.id,
  status: "publish",
  publishedAt: new Date().toISOString(),
});

const draft = await nextpress.preview.page({ id: page.id });
```

### Create a page from a template

```ts
const template = await nextpress.templates.get({ id: templateId });

const page = await nextpress.pages.create({
  title: "Landing",
  status: "draft",
  blocks: template.blocks ?? [],
});
```

### Apply a template to an existing page

```ts
const [page, template] = await Promise.all([
  nextpress.pages.get({ id: pageId }),
  nextpress.templates.get({ id: templateId }),
]);

await nextpress.pages.update({
  id: pageId,
  blocks: [...(page.blocks ?? []), ...(template.blocks ?? [])],
});
```

### Preview share link

```ts
const { previewUrl } = await nextpress.preview.createShareToken({
  contentType: "page",
  contentId: pageId,
  expiresInSeconds: 300,
});
```

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

---

## Starter layout

```ts
const blocks = nextpress.blocks.starterLayout();
// [ heading level 1, paragraph placeholder ]
```
