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
| `sdk:test:integration` | `pnpm --filter @nextpress-org/sdk test:integration` | Integration tests (needs server + API key) |
| `sdk:lint` | `pnpm --filter @nextpress-org/sdk lint` | Biome check |
| `sdk:lint:fix` | `pnpm --filter @nextpress-org/sdk lint:fix` | Biome auto-fix |
| `sdk:dev` | `pnpm --filter @nextpress-org/sdk dev` | tsup watch mode |

From `packages/sdk/`:

```bash
pnpm install
pnpm build
pnpm test
pnpm test:integration   # dev server + integration.config.ts required
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
  editor/*.test.ts             # Editor session + undo stack
  events/*.test.ts             # Event bus + HTTP instrumentation
  test/
    integration/               # Real API key + dist bundle
    security.test.ts
    edge-cases.test.ts
    performance.test.ts
    schema-security.test.ts
```

### Run subsets

```bash
# From packages/sdk
npx vitest run src/test/security.test.ts
npx vitest run src/create-nextpress.test.ts
```

### Running integration tests

Integration tests hit a **running NextPress server** with a **real dashboard API key** and import the **built `dist/` bundle**.

1. Copy the example config and fill in your values:

```bash
cp src/test/integration/integration.config.example.ts src/test/integration/integration.config.ts
```

2. Edit `integration.config.ts` (gitignored):

```ts
export const integrationConfig = {
  enabled: true,
  baseUrl: "http://localhost:5000",
  apiKey: "npk_live_…",           // Settings → System → API Keys
  siteId: "your-site-uuid",        // same site you chose when creating the key
  requestTimeoutMs: 30_000,
  serverReadyTimeoutMs: 60_000,
};
```

3. Start the dev server, then run:

```bash
pnpm test:integration
```

Use the **Content editor** preset (or full access) when creating the key. Set `enabled: false` to skip the suite without deleting the file.

Unit tests (`pnpm test`) never call the network.

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
