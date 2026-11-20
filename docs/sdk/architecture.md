# Architecture

**Type:** Concept  
**Source:** `packages/sdk/src/`

## Intent

Provide a typed, publishable npm package that wraps the NextPress REST API without importing monorepo `@shared` code. Integrators get one factory (`createNextpress`) and namespaced resources instead of raw HTTP.

## Factory pattern

```ts
createNextpress(options) → {
  on, off, once,     // typed event hooks
  http,              // low-level client (advanced use)
  blocks,            // local block tree builder
  config,            // { baseUrl, siteId } only
  auth, posts, pages, … // resource namespaces
  createEditorSession, // stateful editor with undo/redo
}
```

No classes. Each resource is a factory returning a plain object of async functions (`createPagesResource`, etc.), consistent with project AGENTS.md rules.

## Package layout

```
packages/sdk/src/
  create-nextpress.ts    # Main factory, wires all resources
  index.ts               # Public exports
  client/
    http-client.ts       # Bearer auth, timeout, JSON/FormData
    build-url.ts         # URL + siteId query merge
    validate-input.ts    # Zod parse wrapper
    nextpress-error.ts   # API error type
  events/                # Typed lifecycle hooks + contextual entity.set
  resources/             # One file per REST domain
  editor/                # Stateful session + undo stack
  blocks/                # Block definitions + builder helpers
  schemas/               # Zod schemas (mirrors validation rules)
  types/                 # Domain types, inputs, responses
  test/                  # Unit, integration, security tests
```

## HTTP client

- Sends `Authorization: Bearer {apiKey}` on every request unless `auth: false`
- Caller-supplied `Authorization` headers cannot override the configured key
- Default timeout 30s with `AbortController`
- `204` responses return `undefined`
- Non-2xx responses throw `NextpressError`
- Successful mutations emit typed events; handlers can reshape entities via `page.set()`, `post.set()`, etc.

## Type strategy

Types are **self-contained** in `packages/sdk/src/types/`. The package does not import from monorepo `@shared` so it can publish standalone to npm.

Input types live in `types/inputs.ts`. Response shapes in `types/domain.ts` and `types/responses.ts`. Zod schemas in `schemas/index.ts` enforce inputs at runtime.

## Blocks model

There is **no** `/api/blocks` endpoint. Blocks are JSON arrays on `Page.blocks`, `Post.blocks`, and `Template.blocks`. The SDK builds `BlockConfig[]` locally via `nextpress.blocks.*` and sends them on create/update.

## Editing workflows

| Layer | Use when |
|-------|----------|
| Resource methods (`pages.update`, `posts.create`, …) | Scripts, CI, one-shot API calls |
| `createEditorSession` | Local undo/redo, coalesced edits, preview links, version restore |

## Non-goals

- Key management (dashboard only)
- Better Auth flows (sign-in/up/out)
- Client-side rendering or block registry UI
- Automatic retries or rate-limit handling (not implemented in v0.1)

## Constraints

- Node 20+ (`package.json` engines)
