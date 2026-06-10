# Blocks & Page Builder Audit Report

> Comprehensive audit of all blocks, page builder features, and shared patterns.
> Conducted: 2026-06-03

---

## Resolution Status (updated 2026-06-04)

Much of this audit has been actioned by the global theming migration (Phases 1–6) and
Phase 7 (see `task.md`, commit `08bc367`). Status of the original findings:

| Finding | Status |
|---|---|
| Auto-save "completely missing" / README claim FALSE | ✅ **Was already implemented** (parent-level debounced `queueDraftSave` + restore-on-reload). README claim is true. |
| Block deselection on settings interaction | ✅ **Fixed** — `PageBuilder` derives `blocks = currentState` directly (no dual state / sync effect). |
| `post-new` orphan block | ✅ **Removed** (moved to `/trash`). |
| `TokenSpacingPicker` dead code | ✅ **Deleted** — freeform CSS + `UnitToggle` is the chosen spacing pattern. |
| Dual state management in `PageBuilder` | ✅ **Resolved** — single source of truth (`currentState`). |
| Block library search/filter missing | ✅ **Added** (label/description/category filter). Verified in `BlockLibrary.tsx`. |
| Keyboard shortcuts (Delete/Esc/Ctrl+D) missing | ✅ **Added** (guarded against text inputs). Verified in `PageBuilder.tsx`. |
| `PublicBlockRenderer`: hardcoded `#007cba`, unparsed markdown | ✅ **Fixed** — `var(--npb-accent)` + `react-markdown`/`remark-gfm`. Post SSR renderers also migrated to `var(--npb-*)` tokens. |
| Visual drop placeholders + auto-scroll missing | ✅ **Added** (DnD `placeholderIndex` + rAF auto-scroll). Verified in `dnd/index.tsx`. |
| Debug `console.log` in `useDragAndDropHandler` | ✅ **Removed** (kept the `console.error`). |
| `post-featured-image` inline styles | ✅ **Resolved** (Phase 5a + theming migration); uses Tailwind + `npb-*` tokens. Only data-driven inline styles remain (`aspectRatio`/`objectFit`). |
| Hardcoded Tailwind colors across blocks/shell | ✅ **Migrated** to `npb-*` tokens (Phases 1–5). |
| Oversized: columns / group / container | ✅ **Split** into model + settings + block files (< 400 LOC each). |
| README block counts (42/32/4) | ✅ **Corrected** (25 basic + 1 icon + 10 post = 36; added missing `Container`). |
| Oversized: post-list, image, table, video, post-info, cover, media-text, post-comments, gallery, post-navigation | ✅ **Split** into model + settings + block files (all main files < 400 LOC). post-author-box (385) and post-featured-image (340) dropped under 400 during the theming migration — no split needed. |
| Settings pattern divergence (A vs B) → `useSettingsState` | ✅ **Resolved** — `useSettingsState` hook unifies all settings panels (35 components migrated; flat-content blocks use it fully, bespoke blocks use it for accessor+rerender and keep their token/layout/data logic). `markdown` excluded (no settings). |
| Reusability: `createBlockDefinition` | ✅ **Built** (opt-in factory; absorbs `useBlockState` wiring + optional content parse/serialize). Rollout to pure blocks in progress; bespoke-component blocks (extra hooks/effects) keep custom components. |
| Reusability: `BlockShell` | 🗓️ **Planned** — extract shared rendering shell for all blocks. |
| Reusability: `LinkSettings` / `MediaUrlField` | 🗓️ **Planned** — extract shared components to reduce duplication across 6–7 blocks. |
| Renderer dual type system (`BlockConfig` vs `BlockData`) | ✅ **Resolved** — Phase 8 unified on `BlockConfig`. `BlockData` type + `adapt-block-config.ts` adapter deleted. Renderer components consume `BlockConfig` directly. `PublicBlockRenderer` replaced with 82 LOC wrapper. ~1900 LOC net deleted. |
| README Known Issues statuses (posts save, columns fit) | ⬜ **Open** — pending behavioral in-app verification. |
| Animation System | ✅ **Implemented** — Full system: editor UI (`AnimationPicker`), preview, SSR injection, custom IntersectionObserver entry animations (not AOS). Entry/hover/loop all working. |
| Template system SSR wiring | ❌ **Not implemented** — `renderTemplateBlocks()`, `buildRenderContext()`, `shouldRenderTemplate()` defined but zero call sites in routes. |
| `createBlockDefinition` factory rollout | ⚠️ **89% complete** — 33/37 blocks use factory. 4 still raw: columns, icon, markdown, image. |
| Responsive per-device styles, copy/paste, undo structural sharing | ⬜ **Open** (roadmap). |

Inline markers below: **✅ RESOLVED** tags annotate individual findings; unmarked items remain open.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [README vs Reality](#readme-vs-reality)
3. [Canonical Block Pattern (Heading as Reference)](#canonical-block-pattern)
4. [Block Registry Audit](#block-registry-audit)
5. [Block-by-Block Assessment](#block-by-block-assessment)
6. [Page Builder Features Audit](#page-builder-features-audit)
7. [Inconsistencies & Broken Functionality](#inconsistencies--broken-functionality)
8. [Reusability Analysis](#reusability-analysis)
9. [Renderer (Server-Side) Analysis](#renderer-analysis)
10. [Ideal UX Recommendations](#ideal-ux-recommendations)
11. [Priority Action Items](#priority-action-items)

---

## Executive Summary

**36 blocks registered** (26 core + 10 post), not 42 as README claims. 1 orphan block (`post-new`) exists but is unreachable. All blocks use `useBlockState` hook consistently, but settings implementations diverge into two incompatible patterns. The page builder delivers most README-claimed features except **auto-save** (completely missing). The biggest systemic issues are: duplicated settings boilerplate across 36 blocks, a dead `TokenSpacingPicker` component, and a parallel renderer with its own type system.

> ✅ **Update (2026-06-04)**: README counts corrected; `post-new` deleted; `TokenSpacingPicker` deleted; auto-save was actually present (claim is true). Remaining systemic issues: settings-boilerplate duplication and the parallel renderer type system. See [Resolution Status](#resolution-status-updated-2026-06-04).

**Overall UX Score: 6.5/10** — Solid foundation, significant gaps in polish and consistency.

---

## README vs Reality

| README Claim | Actual State | Verdict |
|---|---|---|
| **42 blocks total** (32 basic + 4 icon + 10 post) | **36 registered** (26 core + 10 post). "4 icon sets" = 1 icon block with 4 icon *libraries*, not 4 blocks | **Inflated** |
| **Block-based editing with drag and drop** | Custom DnD library (486 LOC). Works for library→canvas, reorder, nest in containers. No auto-scroll, no visual drop placeholders | **Full** (rough edges) |
| **Device preview** (Desktop, Tablet, Mobile) | `DevicePreview.tsx` — maxWidth constraint (375/768/100%). 300ms animated transition. No per-device style overrides | **Full** (basic) |
| **Page settings** (title, slug, template, status, SEO meta) | `PageSettings.tsx` — 3 tabs: General, Design, SEO. Comprehensive. No slug auto-gen from title | **Full** |
| **Block settings** (styles, spacing, colors, link URLs) | `BlockSettings.tsx` (1244 LOC) — 3 tabs: Content, Style, Advanced. Typography, colors, spacing, borders, position, layout, animations | **Full** |
| **Live preview of changes** | Canvas IS the live preview. Changes reflect immediately via `commitBlocks → currentState → re-render` | **Full** |
| **Undo/redo functionality** | `useUndoRedo` hook — 300ms coalesce, 50-state limit, Ctrl+Z/Shift+Z/Y. Full snapshot storage (memory heavy) | **Full** |
| **Auto-save to prevent lost work** | ✅ **CORRECTION (2026-06-04): it DOES exist** — at the parent level (`PageBuilderEditor.queueDraftSave`, debounced) with restore-on-reload via `loadPageDraft`. The original audit missed it. | ~~FALSE~~ → **True** |
| **Columns do not fit content properly** | Block **split** into model+settings+block files (< 400 LOC), but the `columnLayout` `useEffect` and fit-content behavior were moved verbatim — not behaviorally changed | **Refactored; behavior unverified** |
| **Posts do not save content or slug** | Root cause (block deselection on settings interaction) is **fixed** — posts should now save. End-to-end save not yet re-verified in-app | **Likely fixed; verify in-app** |

### Block Count Discrepancy

README lists 32 basic blocks. Actual core blocks registered:

| # | Block ID | Label | Category |
|---|---|---|---|
| 1 | `core/heading` | Heading | basic |
| 2 | `core/paragraph` | Paragraph | basic |
| 3 | `core/button` | Button | basic |
| 4 | `core/buttons` | Buttons | basic |
| 5 | `core/image` | Image | basic |
| 6 | `core/gallery` | Gallery | basic |
| 7 | `core/video` | Video | basic |
| 8 | `core/audio` | Audio | basic |
| 9 | `core/spacer` | Spacer | layout |
| 10 | `core/separator` | Separator | basic |
| 11 | `core/columns` | Columns | layout |
| 12 | `core/container` | Container | layout |
| 13 | `core/group` | Group | layout |
| 14 | `core/quote` | Quote | basic |
| 15 | `core/list` | List | basic |
| 16 | `core/media-text` | Media Text | basic |
| 17 | `core/cover` | Cover | basic |
| 18 | `core/file` | File | basic |
| 19 | `core/code` | Code | basic |
| 20 | `core/html` | HTML | advanced |
| 21 | `core/pullquote` | Pullquote | basic |
| 22 | `core/preformatted` | Preformatted | basic |
| 23 | `core/table` | Table | basic |
| 24 | `core/markdown` | Markdown | advanced |
| 25 | `core/icon` | Icon | basic |
| 26 | `core/divider` | Divider | basic |

**26 core blocks**, not 32. Categories are mixed (basic, layout, advanced, media) — README treats them all as "basic."

---

## Canonical Block Pattern

The **heading block** (`blocks/heading/HeadingBlock.tsx`, 283 LOC) is the reference implementation. Every block should follow this structure:

### File Structure (Single File, ≤400 LOC)

```
// 1. IMPORTS
// 2. TYPES — content type extending BlockContent
// 3. CONSTANTS & DATA — DEFAULT_CONTENT, lookup tables, option arrays
// 4. UTILITIES — pure helper functions (className builders, text extractors)
// 5. RENDERER — pure presentational component (no state, no hooks)
// 6. MAIN COMPONENT — thin wrapper: useBlockState → Renderer
// 7. SETTINGS COMPONENT — sidebar settings with CollapsibleCard
// 8. BLOCK DEFINITION — exported BlockDefinition object
```

### Key Pattern Elements

**Types** — Content type extends `BlockContent` with block-specific fields:
```typescript
type HeadingContent = BlockContent & {
  level?: number;
  anchor?: string;
  className?: string;
  textAlign?: "left" | "center" | "right" | "justify";
};
```

**Constants** — Sensible defaults, lookup tables as `Record` or `as const`:
```typescript
const DEFAULT_CONTENT: HeadingContent = { kind: "text", value: "", level: 2, ... };
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
const HEADING_FONT_SIZES: Record<number, string> = { 1: "2.5rem", ... };
```

**Renderer** — Pure function component. Takes `content` + `styles`, returns JSX. No hooks, no state:
```typescript
function HeadingRenderer({ content, styles }: HeadingRendererProps) { ... }
```

**Main Component** — Thin wrapper. `useBlockState` → pass to renderer:
```typescript
export function HeadingBlockComponent({ value, onChange }: BlockComponentProps) {
  const { content, styles } = useBlockState<HeadingContent>({ value, getDefaultContent: () => DEFAULT_CONTENT, onChange });
  return <HeadingRenderer content={content} styles={styles} />;
}
```

**Settings** — Uses `getBlockStateAccessor` + `CollapsibleCard` sections:
```typescript
function HeadingSettings({ block, onUpdate }: HeadingSettingsProps) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = React.useState(0);
  const content = accessor ? (accessor.getContent() as HeadingContent) : ...;
  // CollapsibleCard sections with Label + Input/Select/Button controls
}
```

**Block Definition** — Complete `BlockDefinition` with both `component` and `settings`:
```typescript
export const HeadingBlock: BlockDefinition = {
  id: "core/heading", label: "Heading", icon: Heading1,
  description: "Add a heading text", category: "basic",
  defaultContent: { ... }, defaultStyles: { ... },
  component: HeadingBlockComponent, settings: LegacyHeadingSettings, hasSettings: true,
};
```

### Complex Block Variant (Icon Block — 3-File Split)

For blocks exceeding 400 LOC, the **icon block** demonstrates the correct split:

| File | Purpose | LOC |
|---|---|---|
| `IconBlock.tsx` | Component + renderer + definition | 158 |
| `icon-block-settings.tsx` | Settings UI | 451 |
| `icon-block-model.ts` | Data model, parse/serialize, defaults | ~100 |

**Rule**: Simple blocks → single file. Complex blocks (>400 LOC) → 3-file split following icon block pattern.

---

## Block Registry Audit

### Registered Blocks: 36

| Category | Count | Blocks |
|---|---|---|
| Core (basic) | 19 | heading, paragraph, button, buttons, image, gallery, video, audio, separator, quote, list, media-text, cover, file, code, pullquote, preformatted, table, divider |
| Core (layout) | 4 | spacer, columns, container, group |
| Core (advanced) | 2 | html, markdown |
| Core (icon) | 1 | icon |
| Post | 10 | title, excerpt, featured-image, list, toc, author-box, comments, navigation, info, progress |

### Orphan Blocks: 1

| Block | Directory | Status |
|---|---|---|
| `post-new` | `blocks/post-new/` (267 LOC) | **NOT REGISTERED** in `index.ts`. Full implementation exists but unreachable. Either register or delete. |

### Missing from README

README lists these as separate blocks but they don't exist as distinct blocks:
- "Icon Sets" (4) — This is 1 icon block with multiple icon *libraries* (Lucide, react-icons, SVGL), not 4 separate blocks

---

## Block-by-Block Assessment

### Pattern Classification

All 36 registered blocks use **both** patterns (`component:` + `settings:`). No block uses only the new component pattern. Markdown has `component:` only but `hasSettings: false`.

### Settings Architecture Divergence

Two incompatible settings patterns coexist:

| Pattern | Users | Mechanism | Problem |
|---|---|---|---|
| **A: `setUpdateTrigger` force-render** | 26 core blocks | Settings reads `accessor.getContent()`, calls `accessor.setContent()`, bumps `useState` counter to force re-render | Hack — settings shouldn't need manual re-render forcing |
| **B: Direct accessor (no force-render)** | 10 post blocks | Settings reads `block.content` as fallback, calls `accessor.setContent()` without force-render | Reads stale `block.content` instead of `accessor.getContent()` |

**Recommendation**: Unify on Pattern A (heading block style) as the canonical approach. Pattern B's stale prop reading causes settings to show outdated data.

### Size Assessment (400 LOC Limit)

| Block | LOC | Over Limit? | Notes |
|---|---|---|---|
| columns | 754 | **Yes** | Most complex. Needs 3-file split |
| group | 710 | **Yes** | Massive settings. Needs extraction |
| container | 577 | **Yes** | Needs settings extraction |
| post-list | 561 | **Yes** | Needs 3-file split |
| image | 515 | **Yes** | Has separate `use-image-resize.ts` but still over |
| table | 503 | **Yes** | Needs settings extraction |
| video | 501 | **Yes** | Needs settings extraction |
| post-info | 486 | **Yes** | Needs 3-file split |
| cover | 465 | **Yes** | Needs settings extraction |
| icon-settings | 451 | **Yes** | Already split (good), but settings file itself is over |
| media-text | 439 | **Yes** | Needs settings extraction |
| post-comments | 433 | **Yes** | Needs 3-file split |
| gallery | 422 | **Yes** | Needs settings extraction |
| post-navigation | 420 | **Yes** | Needs 3-file split |
| post-featured-image | 409 | **Yes** | Uses inline styles instead of Tailwind |
| post-author-box | 400 | Borderline | Needs 3-file split |

**15 of 36 blocks exceed or border the 400 LOC limit.**

### useEffect Violations

| Block | Line | Purpose | Severity |
|---|---|---|---|
| columns | 338 | Sync default columnLayout to settings | **Medium** — replaceable with derived state |
| icon-settings | 203, 207 | Sync draft state when icon size/stroke changes | **Low** — replaceable with derived state |
| post-progress | 52 | Scroll event listener for progress bar | **Legitimate** — DOM event subscription |
| post-toc | 143 | Scan DOM for headings in preview mode | **Legitimate** — DOM reading |

**Total: 5 useEffect calls across 4 blocks.** 2 legitimate, 3 replaceable.

### Reference Implementations (Best Blocks)

| Block | LOC | Why It's Good |
|---|---|---|
| **heading** | 283 | Canonical pattern. Clean section organization. Level-aware defaults. Reference for all blocks |
| **text** | 193 | Clean, focused. Single CollapsibleCard. Good for content blocks |
| **spacer** | 166 | Simplest complete block. Slider + Input combo. Reference for simple blocks |
| **markdown** | 129 | Only block with `hasSettings: false`. Pure component. Reference for no-settings blocks |
| **icon** | 158 + 451 | Best architecture for complex blocks. 3-file split. Model/Settings/Component separation |
| **post-title** | 196 | Cleanest post block. Pattern B done right. Reference for post blocks |

### Most Problematic Blocks

| Block | Issue | Severity |
|---|---|---|
| **post-new** | Orphan — not registered, unreachable | **High** — register or delete |
| **columns** | 754 LOC, useEffect anti-pattern, complex DnD | **High** — needs major refactor |
| **group** | 710 LOC, massive unextracted settings | **High** — needs 3-file split |
| **post-featured-image** | Inline styles instead of Tailwind, inconsistent with all other blocks | **Medium** — style normalization |
| **post-info** | 486 LOC, useQuery + fetch, needs 3-file split | **Medium** |

---

## Page Builder Features Audit

### Feature Completeness

| Feature | Status | Quality | Notes |
|---|---|---|---|
| Block-based editing + DnD | **Full** | 7/10 | Custom DnD (486 LOC). No auto-scroll, no visual drop placeholders, debug `console.log` left in |
| Device preview | **Full** | 6/10 | Width constraint only (375/768/100%). No per-device style overrides, no device frame |
| Page settings | **Full** | 8/10 | 3 tabs (General/Design/SEO). Comprehensive. No slug auto-gen from title |
| Block settings | **Full** | 7/10 | 3 tabs (Content/Style/Advanced). 1244 LOC. `TokenSpacingPicker` exists but NOT wired — uses raw text inputs instead |
| Live preview | **Full** | 8/10 | Canvas IS the preview. Animation previews work. No separate preview pane/URL |
| Undo/redo | **Full** | 7/10 | 300ms coalesce, 50-state limit. Full snapshot storage (memory heavy). No persistence across reloads |
| Auto-save | **MISSING** | 0/10 | Zero auto-save. Manual Ctrl+S only. README claim is false |

### Block Library / Inserter

- 5 categories: Basic, Media, Layout, Advanced, Post
- 35 block types presented (matches registry minus `core/divider` which may be categorized differently)
- Collapsible sections with fold-all toggle
- Drag-to-insert from library to canvas
- **Missing**: Search/filter, favorites, recently used

### Block Actions

- **Available**: Duplicate (deep clone + new ID), Delete (with descendant check), Drag reorder
- **Missing**: Move up/down buttons, copy/paste, insert before/after, block locking, visibility toggle

### Keyboard Shortcuts

- **Wired**: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo), Ctrl+S (save)
- **Missing**: Delete/Backspace (delete block), Escape (deselect), Ctrl+D (duplicate), arrow navigation, cheatsheet overlay

### Animation System

- 3 categories: entry, hover, loop
- Animate.css presets with duration slider, delay, play-once
- Live preview (entry via store, hover/loop imperative)
- `BlockAnimationRuntime` for scroll-triggered entry on preview/public
- No custom animation support

### Shared UI Components

| Component | Status | Usage |
|---|---|---|
| `TokenColorPicker` | Active | BlockSettings, ContainerBlock, IconSettings, PageSettings (5 locations) |
| `TokenSpacingPicker` | **DEAD CODE** | **0 consumers** — built but never wired in |
| `NumericWithUnitField` | Active | Icon block settings only (3 uses) |
| `SettingsChipGroup` | Active | BlockSettings only (13 uses) |
| `FreeformSpacingSideRow` | Active | BlockSettings only |
| `IconPicker` | Active | Button and icon blocks |

---

## Inconsistencies & Broken Functionality

> ✅ **Update (2026-06-04)**: Critical 1–4, medium 6/7/8/9/10, and low 11–13/16/17 are **resolved** — see [Resolution Status](#resolution-status-updated-2026-06-04). Medium 8 (oversized blocks) and 5 (settings unification) are now resolved. Items 14, 15 remain open (undo memory; per-device styles).

### Critical Issues

1. **Auto-save is completely missing** — README claims it exists. Browser crash between manual saves = work lost. `pageDraftStorage.ts` has localStorage infrastructure but it's only written on explicit Ctrl+S.

2. **Block deselection on settings interaction** — Documented in `post-blocks-report.md`. Clicking any settings control causes the block to deselect due to a race condition between `useUndoRedo.currentState` and separate `useState` for blocks in `PageBuilder.tsx`.

3. **`post-new` orphan block** — Full 267 LOC implementation exists at `blocks/post-new/` but is not registered in `index.ts`. Unreachable from the UI.

4. **Dual state management in PageBuilder** — `PageBuilder.tsx` maintains BOTH `useUndoRedo.currentState` AND a separate `useState` for `blocks`, synced via useEffect. Creates a window where they're out of sync and causes double emissions.

### Medium Issues

5. **Settings pattern divergence** — 26 core blocks use Pattern A (`setUpdateTrigger` hack), 10 post blocks use Pattern B (stale prop reading). Neither is ideal. Should unify on heading block pattern.

6. **`TokenSpacingPicker` is dead code** — Component exists, is functional, but has zero consumers. BlockSettings uses `FreeformSpacingSideRow` for spacing instead. Either wire it in or delete it.

7. **`post-featured-image` uses inline styles** — Lines 41-65 use inline `style` objects instead of Tailwind classes. Inconsistent with all other blocks.

8. **15 blocks exceed 400 LOC limit** — Most need settings extraction or 3-file split.

9. **Debug `console.log` in production code** — `useDragAndDropHandler` (lines 173-261) has debug logging left in.

10. **`PublicBlockRenderer` issues** — Buttons hardcoded to `#007cba`, markdown outputs raw text (not parsed to HTML).

### Low Issues

11. **No block library search/filter** — 35+ blocks with no way to search.
12. **No visual drop zone indicators** — During drag, no visual gap/placeholder shows where block will land.
13. **No auto-scroll during drag** — Can't drag to edges to scroll the canvas.
14. **Undo/redo stores full snapshots** — No structural sharing, memory heavy for large pages.
15. **No responsive per-device style overrides** — Device preview changes width but styles don't vary per breakpoint.
16. **Missing keyboard shortcuts** — Delete, Escape, Ctrl+D, arrow nav all absent.
17. **Empty "LEGACY RENDERER" comment sections** — Multiple blocks have empty `// LEGACY RENDERER (Backward Compatibility)` sections with no content.

---

## Reusability Analysis

### Well-Abstracted (Score 8-10/10)

| Component | Score | Notes |
|---|---|---|
| `useBlockState` | 9/10 | Used by all 36 blocks. Clean ref-based design. Generic content typing |
| `blockStateRegistry` | 9/10 | `useSyncExternalStore` pattern. Bridges block ↔ settings panel |
| `block-container-placement.ts` | 9/10 | 400 LOC of well-structured flex/grid placement. Used by containers + renderer |
| `columns-layout.ts` | 8/10 | Good abstraction. Shared between client and renderer |
| `IconRenderer` | 8/10 | Handles 3 icon sets + fallback. Clean resolution logic |
| `SettingsChipGroup` | 8/10 | Clean, reusable. Only consumed by BlockSettings itself |

### Poorly-Abstracted (Score 0-5/10)

| Component | Score | Notes |
|---|---|---|
| `TokenSpacingPicker` | 0/10 | Dead code. Zero consumers |
| `NumericWithUnitField` | 5/10 | Only used by icon block. Could be generalized but isn't |
| `create-models.ts` | 6/10 | Factory pattern but uses `any` extensively |

### Duplication Report (Patterns Duplicated 3+ Times)

1. **Block boilerplate** (36 blocks) — Every block repeats: `useBlockState<TContent>({ value, getDefaultContent: () => DEFAULT_CONTENT, onChange })` + export `BlockDefinition`. A `createBlockDefinition()` factory could eliminate ~60% of this.

2. **Settings CollapsibleCard pattern** (20+ blocks) — Every block with settings uses identical `CollapsibleCard` + `Label` + `Input`/`Select` structure. 204 CollapsibleCard usages across blocks.

3. **Block rendering wrapper** (36 blocks) — Every block: destructures `content`/`styles` from `useBlockState`, builds className with `block-${id}`, applies inline styles. A shared `BlockShell` component would reduce ~30 lines/block.

4. **Settings accessor boilerplate** (36 blocks) — Every settings component: `getBlockStateAccessor(block.id)` → `setUpdateTrigger` → `accessor.getContent()` → `updateContent` wrapper → fallback to `onUpdate`.

5. **Link settings** (6+ blocks) — Button, image, media-text, file, cover, icon blocks all implement link URL + target + rel settings independently.

6. **Media URL picker** (7+ blocks) — Image, video, audio, gallery, cover, media-text, file blocks all have media URL inputs with similar patterns.

### Missing Abstractions

| Abstraction | Impact | Blocks Affected |
|---|---|---|
| `createBlockDefinition()` factory | ~1500 LOC saved | All 36 |
| `BlockShell` wrapper component | ~30 lines/block | All 36 |
| `useSettingsState(block)` hook | ~20 lines/block | All 36 with settings |
| `LinkSettings` shared component | ~200 LOC saved | 6+ blocks |
| `MediaUrlField` shared component | ~150 LOC saved | 7+ blocks |
| Content→props mapping in `BlockDefinition` | ✅ **Resolved** — `parseContent`/`serializeContent` on `BlockDefinition`. Renderer components parse their own content. 240-line `extractContentProps` switch deleted. |

---

## Renderer Analysis

### Architecture

The renderer (`renderer/`) is a **separate server-side rendering pipeline** with its own:

- **React component set** (`renderer/react/`) — parallel block implementations in `basic/`, `media/`, `layout/`, `advanced/`
- **Type system** (`renderer/react/block-types.ts`) — `BlockData` discriminated union, separate from editor's `BlockConfig`
- **Bridge** (`renderer/adapt-block-config.ts`) — `BlockConfig → BlockData` transformation with 240-line `extractContentProps()` switch
- **HTML output** (`renderer/to-html.tsx`) — `ReactDOMServer.renderToString` (interactive) or `renderToStaticMarkup` (static)

### Inconsistencies

| Issue | Impact |
|---|---|
| **Dual type systems** | `BlockConfig` (editor) vs `BlockData` (renderer) — must stay in sync manually |
| **Dual component sets** | 36 editor blocks + ~25 renderer blocks — rendering logic duplicated |
| **Manual content extraction** | `extractContentProps()` is a 240-line switch re-implementing content knowledge each block already has |
| **Token resolution divergence** | Renderer has `resolveTokenMapForSSR()`, editor resolves differently via `block.styles` |

### Shared Code (Properly Used by Both)

- `shared/animation-utils.ts` — animation CSS generation
- `shared/block-container-placement.ts` — flex/grid placement
- `shared/columns-layout.ts` — columns data + style builders

---

## Ideal UX Recommendations

### Block Pattern Unification

**Goal**: Every block follows the heading block pattern.

1. **Standardize on Pattern A** (heading block settings style) for all blocks
2. **Extract `useSettingsState(block)` hook** — eliminates the accessor + setUpdateTrigger + updateContent boilerplate
3. **Enforce 400 LOC limit** — split oversized blocks using icon block's 3-file pattern
4. **Delete `post-new` or register it** — no orphans

### Page Builder UX Improvements

| Priority | Improvement | Impact |
|---|---|---|
| **P0** | Implement debounced auto-save (localStorage on every `commitBlocks`) | Fixes false README claim, prevents data loss |
| **P0** | Fix block deselection on settings interaction | Core editing brokenness |
| **P1** | Wire `TokenSpacingPicker` into BlockSettings (or delete it) | Dead code or better UX |
| **P1** | Add block library search/filter | 35+ blocks need search |
| **P1** | Add keyboard shortcuts: Delete, Escape, Ctrl+D | Basic editing ergonomics |
| **P2** | Add visual drop placeholders + auto-scroll during drag | DnD polish |
| **P2** | Add block copy/paste + insert-before/after | Power user workflow |
| **P2** | Add box-shadow + opacity controls to Style tab | Design completeness |
| **P3** | Add responsive per-device style overrides | Advanced design control |
| **P3** | Fix `PublicBlockRenderer` hardcoded button colors + unparsed markdown | Public rendering correctness |

### Reusability Improvements

| Priority | Improvement | LOC Saved |
|---|---|---|
| **P1** | Create `createBlockDefinition()` factory | ~1500 |
| **P1** | Extract `BlockShell` wrapper component | ~1080 (30 × 36) |
| **P1** | Extract `useSettingsState(block)` hook | ~720 (20 × 36) |
| **P2** | Extract shared `LinkSettings` component | ~200 |
| **P2** | Extract shared `MediaUrlField` component | ~150 |
| **P2** | Add content→props mapping to `BlockDefinition` | Eliminates 240-line renderer switch |
| **P3** | Delete `TokenSpacingPicker` (dead code) | Removes confusion |

### README Corrections Needed

1. Change "42 blocks" to "36 blocks" (26 core + 10 post)
2. Change "32 basic" to "26 core" with category breakdown
3. Change "4 icon sets" to "1 icon block (4 icon libraries)"
4. Remove "Auto-save to prevent lost work" until implemented
5. Update known issues status (some may be resolved)

---

## Priority Action Items

### Immediate (This Sprint)

1. ✅ **RESOLVED** — **Fix auto-save**: already implemented (parent-level debounced draft save + restore-on-reload).
2. ✅ **RESOLVED** — **Fix block deselection**: `PageBuilder` derives `blocks = currentState` directly; only deselects when the selected block no longer exists.
3. ✅ **RESOLVED** — **`post-new`**: deleted (moved to `/trash`).
4. ✅ **RESOLVED** — **Remove debug `console.log`** from `useDragAndDropHandler` (kept the `console.error`).

### Short-term (Next 2 Weeks)

5. ✅ **RESOLVED** — **`useSettingsState(block)` hook** unifies patterns A and B; all 35 settings components migrated (markdown has no settings).
6. ✅ **RESOLVED** — **Split oversized blocks**: all blocks split to 3-file pattern with main files < 400 LOC (columns, group, container, post-list, image, table, video, post-info, cover, media-text, post-comments, gallery, post-navigation).
7. ✅ **RESOLVED** — **`TokenSpacingPicker`**: deleted (freeform + `UnitToggle` is the chosen pattern).
8. ✅ **RESOLVED** — **Block library search** added (label/description/category).
9. ✅ **RESOLVED** — **Keyboard shortcuts** added (Delete, Escape, Ctrl+D; guarded vs text inputs).

### Medium-term (Next Month)

10. **Create `createBlockDefinition()` factory** — Reduce boilerplate across all blocks.
11. **Extract `BlockShell` wrapper** — Shared rendering shell for all blocks.
12. **Extract shared `LinkSettings` and `MediaUrlField`** — Reduce duplication.
13. ✅ **RESOLVED** — **Unify renderer types** — Phase 8 bridged `BlockConfig` and `BlockData` by eliminating `BlockData` entirely. Single type system, single component set.
14. ✅ **RESOLVED** — **Fix `PublicBlockRenderer`**: button colors → `var(--npb-accent)`; markdown parsed via `react-markdown` + `remark-gfm`.

### Long-term (Roadmap)

15. **Declarative block settings schema** — Schema-driven settings UI generation.
16. **Responsive per-device styles** — Style overrides per breakpoint.
17. **Block copy/paste** — Clipboard integration for blocks.
18. **Undo/redo structural sharing** — Reduce memory footprint.

---

## Appendix: Block Directory Map

```
client/src/components/PageBuilder/blocks/
├── audio/              (305 LOC) ✅ Clean
├── button/             (393 LOC) ✅ Clean
├── buttons/            (390 LOC) ✅ Clean
├── code/               (188 LOC) ✅ Clean
├── columns/            (754 LOC) ⚠️ Over limit, useEffect violation
├── container/          (577 LOC) ⚠️ Over limit
├── cover/              (465 LOC) ⚠️ Over limit
├── divider/            (204 LOC) ✅ Clean
├── file/               (390 LOC) ✅ Clean
├── gallery/            (422 LOC) ⚠️ Over limit
├── group/              (710 LOC) ⚠️ Over limit
├── heading/            (283 LOC) ✅ REFERENCE IMPLEMENTATION
├── html/               (185 LOC) ✅ Clean
├── icon/               (158+451) ✅ Best architecture (3-file split)
├── image/              (515 LOC) ⚠️ Over limit
├── list/               (297 LOC) ✅ Clean
├── markdown/           (129 LOC) ✅ REFERENCE (no-settings block)
├── media-text/         (439 LOC) ⚠️ Over limit
├── post-author-box/    (400 LOC) ⚠️ Borderline
├── post-comments/      (433 LOC) ⚠️ Over limit
├── post-excerpt/       (271 LOC) ✅ Clean
├── post-featured-image/(409 LOC) ⚠️ Inline styles, over limit
├── post-info/          (486 LOC) ⚠️ Over limit
├── post-list/          (561 LOC) ⚠️ Over limit
├── post-navigation/    (420 LOC) ⚠️ Over limit
├── post-new/           (267 LOC) ❌ ORPHAN — not registered
├── post-progress/      (407 LOC) ⚠️ Over limit (legitimate useEffect)
├── post-title/         (196 LOC) ✅ REFERENCE (post block)
├── post-toc/           (369 LOC) ✅ Clean (legitimate useEffect)
├── preformatted/       (249 LOC) ✅ Clean
├── pullquote/          (285 LOC) ✅ Clean
├── quote/              (262 LOC) ✅ Clean
├── separator/          (202 LOC) ✅ Clean
├── shared/             IconRenderer.tsx (265 LOC)
├── spacer/             (166 LOC) ✅ REFERENCE (simple block)
├── table/              (503 LOC) ⚠️ Over limit
├── text/               (193 LOC) ✅ REFERENCE (content block)
├── video/              (501 LOC) ⚠️ Over limit
├── blockStateRegistry.ts
├── index.ts            (block registry)
├── types.ts            (BlockDefinition type)
└── useBlockState.ts    (shared state hook)
```

**Summary**: 18 clean ✅ | 15 over limit ⚠️ | 1 orphan ❌ | 4 reference implementations
