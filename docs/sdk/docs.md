# Docs

**Type:** Guide / Reference  
**Source:** `packages/sdk/src/resources/docs.ts`

A docs is a set of pages on a site with its own header, sidebar and search. The `docs` namespace makes a docs, reads its navigation, adds, moves, orders and deletes its pages and groups, changes its settings, and reads and writes each page as MDX. The MCP docs tools (`list_docs`, `write_docs_page` and the rest) make these same calls.

Reads need `pages:read`; changes need `pages:write`. See [Authentication](./authentication.md).

## Quick start

```ts
import { readDocsMdxProblem, VERSION_STALE } from "@nextpress-org/sdk";

const made = await nextpress.docs.create({ name: "Acme Docs", slug: "docs" });
if (made.isErr) throw made.error;
const { homeId } = made.value;

const added = await nextpress.docs.addItem({ homeId, parentId: homeId, title: "Install", kind: "page" });
if (added.isErr) throw added.error;
const pageId = added.value.item.id;

const current = await nextpress.docs.readPage({ pageId });
const saved = await nextpress.docs.writePage({
  pageId,
  mdx: "## Requirements\n\nDocker.\n",
  expectedVersion: current.version,
  description: "What you need before you install.",
});

if (saved.isErr) {
  const problem = readDocsMdxProblem(saved.error);
  if (problem) console.error(`Line ${problem.line}: ${problem.message}`);
  if (saved.error.code === VERSION_STALE) {
    // The page changed since it was read: read it again, then write again.
  }
}
```

`create` uses the client's site unless you pass `siteId`. The other calls find the site from the docs' `homeId` or the page's `pageId`.

## Methods

| Method | HTTP | Scope | Result |
|--------|------|-------|--------|
| `list({ siteId? })` | `GET /api/docs` | pages:read | `{ docs }`; throws on refusal |
| `create({ name, slug?, siteId?, logoUrl?, search?, features? })` | `POST /api/docs` | pages:write | result: `{ docs, homeId }` |
| `tree({ homeId })` | `GET /api/docs/:homeId/tree` | pages:read | `DocsTree`; throws on refusal |
| `treeOfPage({ pageId })` | `GET /api/docs/items/:pageId` | pages:read | the tree of the docs the page sits in |
| `updateSettings({ homeId, ...changes })` | `PUT /api/docs/:homeId/settings` | pages:write | result: `{ settings }` |
| `addItem({ homeId, parentId, title, kind, slug?, mdx?, position? })` | `POST /api/docs/:homeId/items` | pages:write | result: `{ item }` |
| `updateItem({ pageId, title?, slug?, parentId?, hidden?, kind? })` | `PATCH /api/docs/items/:pageId` | pages:write | result: `{ item }` |
| `reorder({ homeId, parentId, orderedIds })` | `PUT /api/docs/:homeId/order` | pages:write | result: `{ ok: true }` |
| `deleteItem({ pageId })` | `DELETE /api/docs/items/:pageId` | pages:write | result: `{ ok: true }` |
| `readPage({ pageId })` | `GET /api/docs/pages/:pageId/mdx` | pages:read | `DocsPageMdx`; throws on refusal |
| `writePage({ pageId, mdx, expectedVersion, title?, description? })` | `PUT /api/docs/pages/:pageId/mdx` | pages:write | result: `{ ok: true, version }` |
| `exportFile({ homeId, includeFiles? })` | `GET /api/docs/:homeId/export` | pages:read | `PageTransferFile`: `bytes`, `fileName`, `contentType` |

"Result" means the call returns `SdkResult`: check `isErr` before reading `value`. "Throws" means a refusal is thrown as a `NextpressError`.

Notes on the methods:

- `addItem` and `updateItem` use `kind: "page"` for a page with text and `kind: "group"` for a sidebar group. A group takes no text: give the text to a page inside it.
- A new page is a draft. Its address comes from the title unless `slug` is given.
- `reorder` needs every page under the parent, each id once. A list that does not match the pages is refused with a 409, and nothing moves.
- `updateItem` with `parentId` moves the page to the end of that parent's pages.
- The docs home stays at the top of the sidebar: it cannot be hidden, made a group, or moved.
- `deleteItem` is refused (409) for a page that still has pages under it.

## Writing a page: versions and MDX

`readPage` returns the page's MDX and its `version`. Send that version back as `expectedVersion` with `writePage`.

- The MDX is checked as it is saved. A mistake is refused with a 400 and the line to fix. `readDocsMdxProblem(error)` returns the message and the line.
- A version that is no longer current is refused with `VERSION_STALE` (409). Nothing is saved. Read the page again, apply the change to the new text, and write it with the new version.
- `readPage` also lists `skipped`: blocks with no MDX form. A write drops them, so put their content into the MDX first.
- Writing does not publish. Publish with `pages.update({ id, expectedVersion, status: "publish" })`, using the version the write returned, and only when the owner asks.

The components a page may use, their attributes and the writing rules are in the MCP guide: the `get_docs_guide` tool and the `nextpress://docs/guide` resource give the same text. See [MCP getting started](../mcp/getting-started.md).

## Errors

| Status | Meaning | What to do |
|--------|---------|------------|
| 400 with a line | The MDX has a mistake (`readDocsMdxProblem` gives the line) | Fix that line and write again. Nothing was saved. |
| 400 without a line | A field is wrong, such as a title over 200 characters | Read the message; fix the input |
| 403 | The key may not change this docs (another site, or a role that cannot edit content) | Check the key's site and scopes |
| 404 | The docs or page no longer exists, or the page is in no docs | Read the tree again |
| 409 with `VERSION_STALE` | The page changed since it was read | Read it again, then write with the new version |
| 409 without a code | The change clashes with the docs: an address already in use, an order that does not match, or a group with pages under it | Read the tree, then change the request |

Inputs are checked with Zod before any request. A bad input throws `Invalid docs.<method> input: ...` and no request is sent.

## Moving a docs to another site

`exportFile` returns the docs as a page file. That is the file `pageTransfer.import` takes, so the tree, order and pages travel together:

```ts
const file = await source.docs.exportFile({ homeId });
const imported = await target.pageTransfer.import({
  file: file.bytes,
  fileName: file.fileName,
  siteId: targetSiteId,
});
```

Pass `includeFiles: false` to leave images and videos out of the file.
