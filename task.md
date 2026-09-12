# Task — Stacks block (`core/stack`) + 1-Line Layouts

Date: 2026-09-12. Spec: `intent.md` (approved via plan mode).

## Phase 1 — shared layer

- [x] 1a. `shared/stack-model.ts` — StackType/StackContent, read + mode options
- [x] 1b. `shared/stack-shell-styles.ts` — buildStackShellStyles (vertical/horizontal/overlay, reverse-aware)
- [x] 1c. Pin recognition: `parentAllowsChildPin` accepts core/stack (auto-layout-model.ts); `getOverlayChildItemStyles` in block-container-placement.ts
- [x] 1d. `container-child-flex.ts` — optional `shrink` param (Pancake `flex: 0 1 <w>`)

## Phase 2 — registry plumbing

- [x] 2a. `known-block-names.ts` + SDK `block-definitions.ts`: core/stack
- [x] 2b. `render-defaults.ts`: case "core/stack" (width 100%, box-sizing, no factory padding)
- [x] 2c. `publish-block-css.ts`: `.wp-block-stack` + `.wp-block-stack__inner` shell guards
- [x] 2d. `dimension-presets.ts`: ASPECT_RATIO_PRESETS + GRID_MIN_TRACK_WIDTH_PRESETS; RAM starter in GRID_TRACK_STARTERS

## Phase 3 — editor

- [x] 3a. `blocks/stack/{stack-model.ts,StackBlock.tsx,stack-settings.tsx}` — mode chips (Vertical/Row/AB), drift hint, Layers strip (select + restack)
- [x] 3b. `blocks/index.ts` register; `BlockSettings.tsx` isLayoutBlock + stack mode sync handler + "Shrink when tight" card; `auto-layout-panel.tsx` stack guards + Aspect ratio control + RAM min-column-width field

## Phase 4 — publish

- [x] 4a. `renderer/react/layout/index.tsx` StackBlock (shared helpers, overlay + pancake aware)
- [x] 4b. `block-components.tsx` registry entry
- [x] Shrink flag wired at every `getHorizontalFlexChildStyles` call site (editor ContainerChildren, PublicBlockRenderer, Group/Container/Stack renderers, layout-signature)

## Phase 5 — tests + verification

- [x] 5a. `shared/stack-shell-styles.test.ts` — 12 tests: modes, stale-direction override, overlay cell, pins, pancake, pin recognition, signature carry
- [x] 5b. Golden layout tests still pass unchanged (legacy rows untouched)
- [x] 5c. Full suite: 946/946 passed (139 files). `tsc` client: 0 new errors (10 pre-existing). `pnpm check` (server): clean. SDK errors pre-existing in unrelated files.
- [ ] 5d. Visual QA on dev server (owner starts it — agents never start servers): drop a Stack, switch modes, layer 2 children AB, aspect + RAM + pancake controls

## Notes / decisions log

- Overlay = grid single-cell (no absolute); height follows tallest child.
- Child order = paint order; `other.stackLayer` overrides (existing Advanced card).
- Stack has no tagName picker in v1 (Group covers semantic tags).
- AutoLayout panel: Stack hides Display chips (mode owns layout); overlay hides Stack/Grid sections; direction chip writes through to content.stackMode via `setStackMode`.
- Pancake intent lives on `child.settings.stackShrink` — not styles — so no CSS side effects; default off = zero legacy drift.
- Modes write starter styles on switch (like Group starters); drift hint shown when Style tab diverges.
