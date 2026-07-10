# SDK versioning and safe mutations

**Type:** Reference  
**Source:** `packages/sdk/src/resources/`, `packages/sdk/src/client/safe-request.ts`

## Why

Pages and posts use **optimistic concurrency**. An SDK script or AI agent must not silently overwrite edits made in the admin UI or by another client.

## Workflow

1. **Read** — `pages.get({ id })` or `posts.get({ id })` (throws on failure).
2. Note `version` from the response (defaults to `0`).
3. **Write** — `pages.update({ id, expectedVersion: version, ... })`.
4. Check **`result.isErr`** (alias: `result.isError`) before using `result.value`.

```ts
const current = await client.pages.get({ id: pageId });

const result = await client.pages.update({
  id: pageId,
  expectedVersion: current.version ?? 0,
  blocks: nextBlocks,
});

if (result.isErr) {
  console.error(result.error.code, result.error.message);
  process.exit(1);
}

const saved = result.value;
// saved.version === previous + 1
```

## Result API (slang-ts pattern)

Mutations return `SdkResult<T>`:

| Method | Returns |
|--------|---------|
| `pages.create` | `Promise<SdkResult<Page>>` |
| `pages.update` | `Promise<SdkResult<Page>>` |
| `pages.delete` | `Promise<SdkResult<DeleteMessage>>` |
| `pages.restoreVersion` | `Promise<SdkResult<Page>>` |
| `posts.create` | `Promise<SdkResult<Post>>` |
| `posts.update` | `Promise<SdkResult<Post>>` |
| `posts.delete` | `Promise<SdkResult<DeleteMessage>>` |

Reads (`get`, `list`) still throw `NextpressError` on failure.

```ts
if (result.isErr) {
  // handle result.error (NextpressError)
}
const page = result.value;
```

On `VERSION_STALE`, the SDK logs a **console warning** with remote and expected versions.

## Error codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VERSION_STALE` | 409 | Remote version ≠ `expectedVersion`. GET latest and retry. |
| `VERSION_REQUIRED` | 400 | PUT missing `expectedVersion`. |
| `PAGE_SLUG_EXISTS` | 409 | Create page with duplicate slug. |

## Editor session (recommended for agencies)

Use `createEditorSession()` for undo/redo, save, publish, and unpublish. The session tracks `expectedVersion` after each load/save.

```ts
const editor = client.createEditorSession();
await editor.load({ type: "page", id: pageId });
editor.setBlocks([...editor.getBlocks(), client.blocks.paragraph({ text: "New copy" })]);
editor.undo();

const saveResult = await editor.save();
if (saveResult.isErr) {
  // VERSION_STALE — reload and merge manually
}

await editor.publish(); // also returns SdkResult
```

## Scripts

- `scripts/create-google-search-page.ts` — create or update with version guard.
- `scripts/editorial-workflow-demo.ts` — full agency workflow with `isErr` checks.

## Database

Posts require the `version` column. See [posts version migration](../internal/posts-version-migration.md).
