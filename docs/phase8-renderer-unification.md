# Phase 8 (planned): Unify the editor / renderer type systems

> Status: **planned, not started** — its own phase per owner decision (2026-06-04).
> Source: blocks-report.md → "Renderer Analysis" + reusability item.

## Problem

There are two parallel block representations:

- **Editor**: `BlockConfig` (`@shared/schema-types`) — what the page builder edits and stores.
- **Renderer (SSR/public)**: `BlockData` discriminated union (`renderer/react/block-types.ts`) —
  what the server-side `renderer/react/*` components consume.

They are bridged by `renderer/adapt-block-config.ts` → `extractContentProps()`, a ~240-line
`switch` that re-implements, per block, content knowledge each block already owns. There is also
a parallel renderer component set (`renderer/react/{basic,media,layout,advanced}/`) duplicating
the editor block renderers, and a separate token resolver (`resolveTokenMapForSSR`).

## Why it's risky (hence its own phase)

- Public rendering correctness depends on it — regressions are visible on live pages.
- Touches the SSR pipeline (`renderer/to-html.tsx`, `ReactDOMServer`), not just the editor.
- The 240-line switch encodes per-block content shapes that must stay byte-compatible.

## Options (decide at phase start)

1. **Bridge, don't merge** (lower risk): keep both types but generate `extractContentProps`
   from a per-block `toRenderProps(content)` declared on the `BlockDefinition` (or via
   `createBlockDefinition`). Removes the giant switch; types stay separate. Incremental.
2. **Unify on `BlockConfig`** (higher value, higher risk): make the renderer consume
   `BlockConfig` directly and delete `BlockData` + the adapter. Requires the public renderer
   to share the editor block renderers (they already largely overlap — see `PublicBlockRenderer`).
3. **Hybrid**: unify the *type* (drop `BlockData`) but keep distinct render components where
   interactivity differs (editor drag/select chrome vs static public output).

Recommended starting point: **Option 1** (kill the switch via per-block `toRenderProps`), then
evaluate Option 2 once the per-block mapping lives on the definitions.

## Prerequisites (now satisfied)

- `createBlockDefinition` factory exists → a natural home for a per-block `toRenderProps`.
- All blocks split into model/settings/main → content types are isolated and importable.

## Acceptance

- `extractContentProps` switch removed or generated.
- No `BlockData`/`BlockConfig` drift (single source, or generated bridge).
- Public render output unchanged (snapshot/visual diff on a representative page set).
- Build + tests green; **manual public-render QA required** (this phase cannot rely on unit tests alone).
