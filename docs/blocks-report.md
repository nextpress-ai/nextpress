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

**UX baseline:** Production-ready editor chrome — DnD, undo/redo, auto-save, device preview with per-device style overrides, block copy/paste, animations, block search, keyboard shortcuts, real template/theme admin UX (no dummy UI). Remaining gaps: template SSR on public routes, Landing marketing shell theming, complex-block BlockShell parity.

**Latest commit:** `0267e93` — template/theme UX, device overrides, CLI seeding, BlockShell rollout, copy/paste, loading shell.

---

## Open Items

### Deferred — discuss before implementing

| Item | Notes |
|---|---|
| **Template system SSR wiring** | `renderTemplateBlocks()`, `buildRenderContext()`, `shouldRenderTemplate()` exist in `server/templates/` but have **zero route call sites**. Block/template `displayConditions` UI exists; evaluation on public render is not wired. See `docs/templates-feature-spec.md`. |
| **Landing / marketing shell** | Public page loading/404 and auth use `npb-*`; Landing page keeps custom styling intentionally. |

### Engineering backlog

| Item | Status | Notes |
|---|---|---|
| **`BlockShell`** | Partial | ~30 simple renderers; columns outer wrapper added; container, group, image, markdown still custom shells |
| **Undo structural sharing** | Partial | Skip duplicate snapshot refs; tree updates preserve sibling block refs |
| **Columns / buttons group UX** | Partial | `npb-*` drop zones + accent tokens; further layout polish possible |
| **Per-device style overrides** | Done (v1) | `other.deviceStyles` + tablet/mobile preview hint; Style tab routes via `useBlockState`; manual save verified in code path |
| **Display conditions (blocks)** | UI done | `ConditionBuilder` on block Advanced tab; SSR evaluation pending |
| **README Known Issues** | Partial | Columns fit fixed; posts save needs periodic in-app verification |

---

## Resolved (no action)

| Area | What shipped |
|---|---|
| **Shared settings** | `LinkSettings` / `MediaUrlField` in button, icon, image, video, media-text, cover, file, audio |
| **Block copy/paste** | Ctrl+C / Ctrl+V via `block-clipboard.ts` + `insertBlockAfterDeep` |
| **Theme-aware loading** | `AppLoadingShell` on route/auth/preview/editor fallbacks |
| **Template / theme UX** | Real admin pages; Design menu apply (blocks + FK); no Unsplash/dummy selectors; `ThemeColorPreview` from theme settings |
| **Default template seed** | `Basic Page` / `Basic Post` on setup wizard + `nextpress install`/`upgrade` via `seed-default-content.js` (idempotent) |
| **Theme activation** | `POST /api/themes/:id/activate` syncs `sites.activeThemeId` |
| **Template preview** | Builder opens `/preview/template/:id` |
| **Icon picker** | Search-first fuzzy modal (`b023610`) |
| **Builder crash fix** | Restored `useTheme` import in `BuilderTopBar` |

Also resolved earlier: auto-save, block deselection, dual PageBuilder state, block library search, DnD placeholders, hardcoded colors → `npb-*`, settings → `useSettingsState`, animation system, renderer unification.

---

## Browser verification (2026-06-12)

| Flow | Result |
|---|---|
| `/admin/themes` | Custom SSR current theme; no fake Install/Preview buttons |
| `/admin/templates` | Real template list + builder actions |
| Design → apply template | Canvas replaced with template blocks |
| Device tablet/mobile toggle | Canvas width + “Style edits apply to … only” hint |
| Block Advanced → Display Conditions | ConditionBuilder renders (Is Homepage, Add Condition) |
| Page builder load | Fixed `useTheme is not defined` crash before re-test |

---

## Canonical Patterns

### Simple block (`createBlockDefinition`)

Reference: `blocks/heading/HeadingBlock.tsx`

```
model (optional) → renderer (pure) → settings → createBlockDefinition({ render, ... })
```

### Per-device styles

- Preview device: `DeviceViewProvider` + top-bar desktop/tablet/mobile toggles
- Storage: `block.other.deviceStyles.{tablet|mobile}` merged in `resolve-block-device-styles.ts`
- Edits: `useBlockState.setStyles` routes to base `styles` (desktop) or device overrides

### Template apply

- **Design menu / create page:** fetch template → `reIdTemplateBlocks()` → PUT blocks + `templateId`
- **Sidebar insert:** append re-id'd blocks to canvas (no FK change)

### Shared components

| Component | Path | Purpose |
|---|---|---|
| `BlockShell` | `blocks/shared/block-shell.tsx` | Outer block wrapper |
| `LinkUrlField`, `LinkTargetChips`, `LinkTargetSelect` | `blocks/shared/link-settings.tsx` | Link URL + target |
| `MediaUrlField` | `blocks/shared/media-url-field.tsx` | URL + media library picker |
| `AppLoadingShell` | `components/app-loading-shell.tsx` | Theme-aware route loading |
| `ThemeColorPreview` | `components/themes/theme-color-preview.tsx` | Theme swatches from settings |

---

## Block Registry (36)

| Category | Count | Blocks |
|---|---|---|
| Core (basic) | 19 | heading, paragraph, button, buttons, image, gallery, video, audio, separator, quote, list, media-text, cover, file, code, pullquote, preformatted, table, divider |
| Core (layout) | 4 | spacer, columns, container, group |
| Core (advanced) | 2 | html, markdown |
| Core (icon) | 1 | icon |
| Post | 10 | title, excerpt, featured-image, list, toc, author-box, comments, navigation, info, progress |

---

## Related Docs

- `docs/design-system.md` — admin / builder chrome tokens
- `docs/tailwind-token-system-spec.md` — block content styling tokens
- `docs/templates-feature-spec.md` — template SSR integration (pending)
- `docs/upgrade-flow.md` — CLI upgrade + default content seed step
- `task.md` — phase history and commit references
