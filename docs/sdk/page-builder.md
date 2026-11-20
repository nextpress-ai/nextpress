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

## Agent tools

For an AI agent that builds or edits pages, the SDK ships one set of page tools. The same tools run for outside agents (through MCP, on a saved page) and for an assistant inside the editor (on the copy that is open). The only difference is where the page lives, so you hand the tools two functions:

```ts
import { createPageTools } from "@nextpress-org/sdk";

const tools = createPageTools({
  readTree: async () => (await nextpress.pages.get({ id })).blocks ?? [],
  writeTree: async (change) => {
    // Called once per accepted change, after every check passed.
    const saved = await nextpress.pages.update({ id, expectedVersion, blocks: change.blocks });
    return saved.isErr ? { ok: false, message: saved.error.message } : { ok: true };
  },
  newId: () => crypto.randomUUID(), // must be UUIDs
  // focusBlockId: "…",   // optional: only this block and what is inside it may change
  // site: { listMedia, listPages, listTemplateParts, getTheme }, // optional lookups
});

const result = await tools.find((tool) => tool.name === "get_page_outline")?.run({});
// result: { ok: boolean, text: string }, with `text` written for the model to read
```

Each tool has a `name`, a `description` that tells a model when to use it, an `inputShape` (a Zod shape, so it works with MCP and with other AI libraries) and `run(input)`. `run` checks its input itself and never throws: a wrong input comes back as `{ ok: false, text }` saying what to fix.

| Tool | What it does |
|------|--------------|
| `get_page_outline` | Short outline of the page with ids. Read this first |
| `get_block` | One block in full. A very large one comes back cut, and says so |
| `list_block_types` | Every block type, with a note on when to use it |
| `get_block_type` | One block type with an example exactly as the editor inserts it |
| `change_blocks` | Insert, update, delete, move or replace blocks: up to 50 changes and 300 new blocks per call |
| `check_page` | Lists everything wrong with the page (see `checkPage`) |
| `apply_phone_fixes` | Fixes the phone-layout problems that have an obvious fix |
| `get_design_guide` | The guide to building a good page |
| `list_media`, `list_pages`, `list_template_parts`, `get_theme` | Only present when you pass the matching lookup in `site` |

How `change_blocks` behaves:

- All or nothing. Every change is applied in order, then the page is checked. If the change would add a problem (something the server would refuse to save, an unknown block, a misplaced page shell), the page is left alone, `writeTree` is not called, and the reply says what to fix. Problems the page already had do not block a change: the reply names up to three of them so the agent can offer to fix them.
- New blocks start as the editor would insert them. You only describe what is different (`content`, `styles`, `children`). A `null` value removes a field or style.
- At the page top, new blocks go inside the page shell, and a header goes first, the same as when a person adds one.
- When you set `focusBlockId`, anything outside that block is refused. The selected block can be updated or replaced, but not deleted or moved.
- A new block description nests four levels deep. For a deeper tree, insert the outer blocks first, then insert into the ids the reply gives back.
- Phone-layout problems on the blocks it touched are reported but never stop the change.

Changes sent at the same time are run one after another, so none of them is lost.

`patchBlockTree` also accepts a `replace` change now, which swaps a block and everything inside it for another block in the same place. It is refused when the id is missing or the new block uses an id that already exists elsewhere on the page.

---

## Starter layout

```ts
const blocks = nextpress.blocks.starterLayout();
// [ heading level 1, paragraph placeholder ]
```
