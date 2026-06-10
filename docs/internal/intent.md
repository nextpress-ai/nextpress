# Intent — blocks-report #4: `createBlockDefinition()` factory (+ BlockShell decision)

## What
Add an **opt-in, backward-compatible** factory `createBlockDefinition()` that builds a
block's `component` from a pure `render` function, absorbing the repeated `useBlockState`
wiring (and optional content parse/serialize for structured blocks like icon). Returns a
standard `BlockDefinition` — **registry and renderer are unchanged**.

## Why
blocks-report #4-6 / P1. ~36 blocks repeat: `useBlockState({...}) → <Renderer/>` + a
`BlockDefinition` object. The factory removes the per-block component wrapper boilerplate.

## BlockShell decision (report #2)
NOT building a standalone `BlockShell`. The `block-${id}` wrapper is already centralized in
`BlockRenderer.tsx:577`; each block's own `wp-block-*` class + semantic tag is intrinsic and
not shared. A separate shell would be indirection without dedup (premature abstraction).
Owner approved "do what's best long run" → fold the only real win (useBlockState wiring) into
the factory.

## How
- New `blocks/createBlockDefinition.tsx`:
  - `render({ value, content, styles, settings, setContent, setStyles, setSettings, isPreview, isSelected, onNestedBlockChange })`
  - optional `parseContent` / `serializeContent` (covers icon's structured content)
  - returns `{ ...meta, component }` where `component` wires `useBlockState`.
- Backward compatible: blocks may still declare `component` directly. Bespoke blocks
  (columns' columnLayout effect, container/group children plumbing) can keep custom components.
- Migration: opt-in, block-by-block (delegated like prior batches). Pass the FULL default
  content (the `useBlockState` one) as `defaultContent` so behavior is preserved.

## #3 (renderer dual type-system) — separate phase
Owner: "we want one, can be done as own phase." NOT in this change. Will write a phase plan doc.

## Verify
Build + full tests after the factory + each proof migration. Proof: 2 simple blocks (spacer, divider).

## Backups
Originals copied to /backup/phase-factory/ before edits.
