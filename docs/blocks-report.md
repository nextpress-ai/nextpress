# Blocks & Page Builder — Status

> Living status for the page builder and block library.  
> Original audit: 2026-06-03. Last updated: 2026-06-12.

---

## Summary

| Metric | Value |
|---|---|
| Registered blocks | **36** (26 core + 10 post) |
| `createBlockDefinition` adoption | **37/37** (100%) |
| Settings unification | `useSettingsState` on all panels with settings |
| Renderer types | Single `BlockConfig` pipeline (Phase 8) |
| Block file size | All main block files < 400 LOC (split where needed) |

**UX baseline:** Solid editor (DnD, undo/redo, auto-save, device preview, animations, block search, keyboard shortcuts). Remaining gaps are mostly polish, shared abstractions, and server-side template wiring.

---

## Open Items

### Deferred — discuss before implementing

| Item | Notes |
|---|---|
| **Template system SSR wiring** | `renderTemplateBlocks()`, `buildRenderContext()`, `shouldRenderTemplate()` exist in `server/templates/` but have **zero route call sites**. See `docs/templates-feature-spec.md`. |
| **Theme / public shell** | Public pages and auth screens not yet on admin `npb-*` chrome. Separate from block content tokens (`docs/tailwind-token-system-spec.md`). |

### Engineering backlog

| Item | Status | Notes |
|---|---|---|
| **`BlockShell`** | Done when adopted | Shared outer wrapper (`wp-block-*` + className + styles). Roll out block-by-block as renderers are touched. |
| **`LinkSettings` / `MediaUrlField`** | Done when adopted | Shared settings fields extracted; wire into remaining blocks over time. |
| **README Known Issues** | Partial | Posts save root cause fixed (block deselection); columns fit refactored but behavior unverified. Update README after in-app QA. |
| **Responsive per-device styles** | Roadmap | Device preview is width-only; no per-breakpoint style overrides. |
| **Block copy/paste** | Roadmap | — |
| **Undo structural sharing** | Roadmap | Full snapshots today; memory-heavy on large pages. |

---

## Resolved (no action)

Auto-save (parent `queueDraftSave` + draft restore), block deselection fix, dual PageBuilder state, `post-new` orphan removed, `TokenSpacingPicker` deleted, block library search/filter, keyboard shortcuts (Delete/Esc/Ctrl+D), DnD placeholders + auto-scroll, debug log removal, `PublicBlockRenderer` token + markdown fixes, hardcoded colors → `npb-*`, oversized block splits, README block counts, settings pattern → `useSettingsState`, animation system, renderer type unification (`BlockConfig` only).

---

## Canonical Patterns

### Simple block (`createBlockDefinition`)

Reference: `blocks/heading/HeadingBlock.tsx`

```
model (optional) → renderer (pure) → settings → createBlockDefinition({ render, ... })
```

Factory absorbs `useBlockState` wiring and optional `parseContent` / `serializeContent`.

### Complex block (>400 LOC)

Reference: `blocks/icon/` — split into `*-model.ts`, `*-settings.tsx`, `*Block.tsx`.

### Container block

Reference: `blocks/container/ContainerBlock.tsx` — `isContainer`, `handlesOwnChildren`, pass `value.children` and `onNestedBlockChange` into renderer.

### Settings

Use `useSettingsState({ block, onUpdate, defaultContent })` — never raw `setUpdateTrigger` or stale `block.content` reads.

### Shared components

| Component | Path | Purpose |
|---|---|---|
| `BlockShell` | `blocks/shared/block-shell.tsx` | Outer block wrapper |
| `LinkUrlField`, `LinkTargetChips`, `LinkTargetSelect` | `blocks/shared/link-settings.tsx` | Link URL + target in settings |
| `MediaUrlField` | `blocks/shared/media-url-field.tsx` | URL input + media library picker |

---

## Block Registry (36)

| Category | Count | Blocks |
|---|---|---|
| Core (basic) | 19 | heading, paragraph, button, buttons, image, gallery, video, audio, separator, quote, list, media-text, cover, file, code, pullquote, preformatted, table, divider |
| Core (layout) | 4 | spacer, columns, container, group |
| Core (advanced) | 2 | html, markdown |
| Core (icon) | 1 | icon |
| Post | 10 | title, excerpt, featured-image, list, toc, author-box, comments, navigation, info, progress |

Icon “sets” in README = one icon block with multiple libraries (Lucide, react-icons, SVGL), not four blocks.

---

## Related Docs

- `docs/design-system.md` — admin / builder chrome tokens and UI patterns
- `docs/tailwind-token-system-spec.md` — block content styling tokens
- `docs/templates-feature-spec.md` — template SSR integration (pending)
- `task.md` — phase history and commit references
