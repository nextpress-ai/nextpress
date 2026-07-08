# NextPress SDK Documentation

**Version:** 0.1.0  
**Date:** July 2, 2026  
**Package:** `@nextpress-org/sdk`

Official TypeScript SDK for the NextPress CMS REST API. Use it for scripts, automation, integrations, and programmatic page builder workflows.

## Document map

| Document | Type | Purpose |
|----------|------|---------|
| [Getting started](./getting-started.md) | Guide | Install, create a client, first API calls |
| [Architecture](./architecture.md) | Concept | Package layout, factory pattern, design constraints |
| [Authentication](./authentication.md) | Guide / Reference | API keys, scopes, multi-site, session dev mode |
| [Resources](./resources.md) | Reference | Every namespace, method, and HTTP endpoint |
| [Page builder](./page-builder.md) | Guide | Editor session, resource workflows, undo/redo, publish |
| [Blocks](./blocks.md) | Reference | Block helpers, `BlockConfig`, all 35 block types |
| [Preview](./preview.md) | Guide | Authenticated preview and share links |
| [Errors and validation](./errors-and-validation.md) | Reference | `NextpressError`, Zod input validation |
| [Development](./development.md) | Guide | Build, test, lint, live integration tests |

## Quick reference

```ts
import { createNextpress } from "@nextpress-org/sdk";

const nextpress = createNextpress({
  baseUrl: "https://cms.example.com",
  apiKey: process.env.NEXPRESS_API_KEY!,
  siteId: "your-site-uuid",
});
```

**Source of truth:** `packages/sdk/src/`  
**Published entry:** `packages/sdk/dist/index.js`  
**Consumer README:** `packages/sdk/README.md` (short install + quick start)

## What the SDK does

- Sends typed HTTP requests to the NextPress REST API
- Validates all inputs with Zod before network calls
- Exposes resource namespaces (`pages`, `posts`, `settings`, etc.)
- Builds page builder block trees locally (no separate blocks API)
- Provides `createEditorSession` and resource methods for page builder workflows

## What the SDK does not do

- Create or revoke API keys (dashboard only: Settings → System → API Keys)
- Sign in, sign up, or sign out (Better Auth stays in the dashboard)
- Render HTML or run the page builder UI
- Bundle server-side NextPress code

## Related server docs

- API key scopes (server-side): `shared/api-key-scopes.ts`
- Content access rules: `server/lib/content-access.ts`
- API key routes: `server/routes/api-keys.routes.ts`

When behavior changes in `packages/sdk`, update the matching doc in this folder.
