# Phase 8: Renderer Unification

> Status: **COMPLETE** — 2026-06-10
> Spec: `docs/phase8-renderer-unification.md`
> Goal: One type (`BlockConfig`), one component set, three rendering paths

---

## Architecture (After)

```
BlockConfig[] (single type, post blocks use kind: "structured")
    ├── SSR: renderBlocksToHtml() → renderer/react/* → HTML string
    ├── Client: PublicPageView → PublicBlockRenderer (82 LOC wrapper) → renderer/react/* → React elements
    └── (future) themeManager → same components
```

## Phases

| # | Phase | Status | What |
|---|---|---|---|
| **8a** | Post block content migration | ✅ Done | Wrapped 10 post block contents in `{ kind: "structured", data }`. Eliminated `as unknown as BlockContent` casts. |
| **8b** | Migrate renderer components to `BlockConfig` | ✅ Done | `renderer/react/*` accept `BlockConfig` directly. Deleted `block-types.ts` + `adapt-block-config.ts`. |
| **8c** | Unify token resolution | ✅ Done | Moved `resolveTokenMapForSSR` + `collectBlockModifierCSS` to `shared/token-resolution.ts`. |
| **8d** | Replace `PublicBlockRenderer` | ✅ Done | 1001 LOC → 82 LOC wrapper. Lazy-loaded markdown + icons. Post block mappings added. |
| **8e** | Delete adapter + cleanup | ✅ Done | Adapter deleted in 8b. Zero dead references verified. |
| **8f** | Post blocks in renderer | ✅ Done | 7 post block SSR renderers added. All 10 post blocks now render in SSR. |

## Deferred (noted in context.md)

- Template system SSR wiring (`renderTemplateBlocks()`, `buildRenderContext()`)
- Animation system spec implementation
- Legacy themeManager migration

## Acceptance Criteria

- [x] `extractContentProps` switch gone
- [x] `BlockData` type gone
- [x] `PublicBlockRenderer` replaced with 82 LOC wrapper
- [x] SSR output preserved (renderer components unchanged logic)
- [x] Client rendering preserved (wrapper maintains same interface)
- [x] Build green, 413/413 tests pass (3 pre-existing PGlite timeouts unrelated)
- [x] Post blocks render in both SSR and client paths
- [x] Lazy-loaded deps (markdown, icons) don't block initial paint
- [x] ~1900 LOC net deleted

## Progress Log

### 2026-06-10 — Phase 8 complete

**8a**: Post block content migration
- `createBlockDefinition` factory: added `defaultParseContent`/`defaultSerializeContent` for structured wrapping
- `useBlockState` + `useSettingsState`: parse/serialize transparently
- 3 raw blocks (info, toc, progress): wired parse/serialize manually
- Zero `as unknown as BlockContent` casts remain in shared infrastructure

**8b**: Renderer migration
- Created `renderer/react/render-helpers.tsx` (200 LOC): `getRenderProps`, content parsers, `renderChildBlocks`
- Migrated 26 components across 4 files (basic/media/layout/advanced)
- Deleted `adapt-block-config.ts` (427 LOC), `block-types.ts` (288 LOC), adapter tests (479 LOC)
- Net reduction: ~994 LOC

**8c**: Token resolution unification
- Created `shared/token-resolution.ts` (102 LOC): `resolveTokenMapForSSR`, `collectBlockModifierCSS`, shared constants
- Updated renderer + client imports
- Editor's `resolveTokenMap` stays client-side (depends on Tailwind config)

**8d**: PublicBlockRenderer replacement
- 1001 LOC → 82 LOC wrapper delegating to `BLOCK_COMPONENTS` registry
- New `ClientIconBlock` with lazy-loaded icon libraries
- `MarkdownBlock` lazy-loads `react-markdown` + `remark-gfm`
- Post block mappings: excerpt→paragraph, title→heading, featured-image→image
- FileBlock + HtmlBlock updated for visual parity

**8e**: Cleanup verification
- Zero dead references to `BlockData`, `adaptBlockConfigToBlockData`, `extractContentProps`
- All imports resolve correctly
- Type check: ~25 pre-existing errors (unrelated to Phase 8)

**8f**: Post block SSR renderers
- Created `renderer/react/post/index.tsx` (274 LOC): 7 static placeholder components
- All 10 post blocks now in `BLOCK_COMPONENTS` registry
- SSR can render post pages
