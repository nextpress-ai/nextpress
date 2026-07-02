# Development

**Type:** Guide  
**Package path:** `packages/sdk/`

## Monorepo scripts

From repository root:

| Script | Command | Purpose |
|--------|---------|---------|
| `sdk:install` | `pnpm --filter @nextpress-org/sdk install` | Install SDK deps |
| `sdk:build` | `pnpm --filter @nextpress-org/sdk build` | tsup build to `dist/` |
| `sdk:test` | `pnpm --filter @nextpress-org/sdk test` | All unit tests |
| `sdk:test:live` | `pnpm --filter @nextpress-org/sdk test:live` | Live integration (needs server) |
| `sdk:lint` | `pnpm --filter @nextpress-org/sdk lint` | Biome check |
| `sdk:lint:fix` | `pnpm --filter @nextpress-org/sdk lint:fix` | Biome auto-fix |
| `sdk:dev` | `pnpm --filter @nextpress-org/sdk dev` | tsup watch mode |

From `packages/sdk/`:

```bash
pnpm install
pnpm build
pnpm test
pnpm test:live   # LIVE_TEST=1, dev server required
pnpm lint
pnpm typecheck
```

Root `vitest.config.ts` includes the SDK as a separate Vitest project (`|sdk|`).

## Build output

- `dist/index.js` — ESM bundle
- `dist/index.d.ts` — Type declarations (~126KB)
- Published files: `dist/`, `README.md` only (`package.json` `files`)

Build tool: **tsup**. Config in `packages/sdk/tsup.config.ts`.

## Test layout

```
packages/sdk/src/
  *.test.ts                    # Factory tests
  client/*.test.ts             # HTTP client, URL building
  blocks/*.test.ts             # Block builder
  page-builder/*.test.ts       # Page builder workflows
  editor/*.test.ts             # Editor session + undo stack
  test/
    integration.test.ts        # End-to-end mock fetch
    security.test.ts           # Key leakage, scope errors, XSS guards
    edge-cases.test.ts
    performance.test.ts
    schema-security.test.ts
    live/
      integration.live.test.ts # Against real dev server
      bootstrap-live-client.ts
      session-fetch.ts
      live-config.ts
```

### Run subsets

```bash
# From packages/sdk
npx vitest run src/test/security.test.ts
npx vitest run src/create-nextpress.test.ts
```

### Live tests

Requirements:

1. NextPress dev server running (default `http://localhost:5000`)
2. `LIVE_TEST=1` environment variable
3. Credentials in `live-config.ts` or env (see `context.md`)

Live tests use **session cookie fetch**, not real `npk_live_` keys, because the enforcer only applies to Bearer keys with that prefix.

```bash
pnpm sdk:test:live
```

Config: `packages/sdk/vitest.live.config.ts`

## Linting

Biome 2.5 via Ultracite-style rules. Run before commit:

```bash
pnpm sdk:lint:fix
```

## Demo script

`packages/sdk/scripts/build-demo-site.ts` — example script that builds a demo site via the SDK. Run against a live instance after building the package.

## Adding a new resource method

1. Add Zod schema in `schemas/index.ts`
2. Add input/output types in `types/`
3. Implement in `resources/{name}.ts`
4. Wire in `create-nextpress.ts` if new namespace
5. Add tests (mock fetch pattern in `test/mock-fetch.ts`)
6. Update `docs/sdk/resources.md` and `packages/sdk/README.md`

## Adding server routes

When the server adds `/api/*` routes:

1. Add scope rule in `shared/api-key-scopes.ts` (monorepo, not SDK package)
2. Unmapped routes require full key access until a rule exists
3. Document the new SDK method here when implemented

## Publishing

Package name: `@nextpress-org/sdk`  
Version: `0.1.0` (see `packages/sdk/package.json`)

`prepublishOnly` runs `tsup`. Publish with npm/pnpm from `packages/sdk/` after version bump.

## Documentation

Canonical SDK docs: **`docs/sdk/`** (this folder).

Keep in sync when changing public API:

- [Resources](./resources.md) for new methods
- [Authentication](./authentication.md) for scope changes
- [Blocks](./blocks.md) for new block types
- [Architecture](./architecture.md) for structural changes

Agent handoff notes: `context.md` (SDK section).
