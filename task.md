# Global Theming Migration — Task Tracker

## Status: COMPLETE ✅
## All 6 Phases Done
## Started: 2026-06-03 | Completed: 2026-06-03

---

## Pre-flight ✅
- [x] `post-new` orphan block → moved to `/trash/blocks-post-new-20260603/`
- [x] Design reference written → `/docs/design-reference.md`
- [x] Blocks audit complete → `/docs/blocks-report.md`
- [x] Execution plan approved

---

## Phase 1: Foundation (Sequential) ✅
- [x] CSS tokens added to `:root` and `.dark` in `index.css` (lines 5-99)
- [x] Motion tokens added (`--npb-ease-out`, `--npb-ease-in-out`, durations)
- [x] Tokens registered in `tailwind.config.ts` as `npb-*` colors (lines 56-102)
- [x] ThemeProvider created (`client/src/components/ThemeProvider.tsx`)
- [x] App wrapped with ThemeProvider (`client/src/App.tsx` lines 10, 175-181)
- [x] Theme toggle added to TopBar (sun/moon icon, lines 14-15, 18, 47, 99-111)
- [x] Canvas theme toggle added to canvas header bar (lines 6, 15, 33, 98-110)
- [x] Sidebar merged to global `useTheme()` (removed local state, lines 15-23, 47-48)
- **Agent**: frontend-engineer
- **Completed**: 2026-06-03
- **Notes**: Canvas toggle is independent of global (correct per spec — allows designing light pages in dark mode)

---

## Phase 2: Shared Utilities (Sequential) ✅
- [x] `option-button.tsx` — toggle button with active/inactive states, press feedback
- [x] `option-group.tsx` — wraps OptionButtons with SettingsLabel
- [x] `settings-label.tsx` — standard label with optional hint
- [x] `surface-card.tsx` — card surface with optional header, interactive variant
- [x] Barrel export `index.ts` in `client/src/components/PageBuilder/shared/`
- **Agent**: frontend-engineer
- **Completed**: 2026-06-03
- **Notes**: All components use design-reference tokens (no hardcoded colors). Sharp corners for surfaces, rounded for buttons per spec.

---

## Phase 3: Reference Blocks (Sequential) ✅
- [x] heading block migrated → `OptionButton`, `OptionGroup`, `SettingsLabel`
- [x] text block migrated → `SettingsLabel`
- [x] spacer block migrated → `SettingsLabel`
- **Agent**: frontend-engineer
- **Completed**: 2026-06-03
- **Notes**: All 3 blocks now use shared utilities. Heading block's `getOptionButtonClassName()` removed (lines 95-102). Hardcoded `text-gray-700` replaced with `SettingsLabel` across all 3 blocks. Spacer block's "No additional settings" text now uses `text-npb-text-muted` token.

---

## Phase 4: Shell Migration (Sequential)
- [x] BuilderSidebar → tokens + global theme
- [x] BuilderTopBar → tokens
- [x] BuilderCanvas → canvas tokens
- [x] BlockLibrary → `SurfaceCard`, tokens
- [x] PageSettings → tokens
- [x] BlockSettings → tokens
- [x] TokenColorPicker → tokens
- [x] AnimationPicker → tokens
- **Agent**: frontend-engineer
- **Completed**: 2026-06-03
- **Notes**:
  - BuilderSidebar: light mode header row now uses `bg-npb-surface-base`; dark mode uses `bg-npb-surface-base/40` instead of `bg-black/40`; tab trigger classes updated for light mode
  - BuilderTopBar: top-level container now uses `bg-npb-surface-base`, `border-npb-border-default`; sidebar icon uses `text-npb-text-primary`; blocks count uses `text-npb-text-muted`
  - BuilderCanvas: canvas surround now uses `bg-npb-canvas-bg`; page surface now uses `bg-npb-canvas-page`; drag-over highlight uses `bg-npb-accent/10`; empty state text uses `text-npb-text-muted`
  - BlockLibrary: all cards now use `border-npb-border-default`, `bg-npb-surface-base`; hover states use `bg-npb-interactive-bg-hover`, `border-npb-border-strong`; icon containers use `bg-npb-surface-inset`; drag state uses `bg-npb-interactive-bg-active`
  - PageSettings: all `border-gray-200` replaced with `border-npb-border-default`; all `text-gray-500/600` replaced with `text-npb-text-muted`/`text-npb-text-secondary`; border-t dividers use `border-npb-border-default`
  - BlockSettings: already uses `npb-settings-*` CSS classes — no hardcoded Tailwind colors found
  - TokenColorPicker: mode toggle button uses `bg-npb-interactive-bg-active`/`text-npb-interactive-text-active` for active state; `bg-npb-interactive-bg`/`text-npb-interactive-text` for inactive; swatch borders use `border-npb-border-default`/`border-npb-border-strong`; focus rings use `ring-npb-focus`
  - AnimationPicker: preset buttons use interactive tokens; entry options border uses `border-npb-border-default`; labels use `text-npb-text-secondary`; preview button uses `bg-npb-interactive-bg`, `text-npb-text-secondary`

---

## Phase 5: Block Migration (Parallel)
- [x] **5a: Post blocks** (10 blocks) — also remove debug logs, empty legacy comments
  - **Agent**: frontend-engineer
  - **Completed**: 2026-06-03
  - **Files**: post-title, post-excerpt, post-featured-image, post-list, post-toc, post-author-box, post-comments, post-navigation, post-info, post-progress
  - **Changes per block**:
    - All Labels → `SettingsLabel`
    - Heading level buttons → `OptionButton` + `OptionGroup` (post-title)
    - All hardcoded gray/white/black Tailwind colors → design tokens (`bg-npb-surface-*`, `text-npb-text-*`, `border-npb-border-*`)
    - Empty `// LEGACY RENDERER` sections deleted (7 of 10 blocks had them)
    - No debug `console.log` found in any block (all clean)
    - **post-featured-image**: inline `style` objects for URL input row → Tailwind classes (`flex gap-1.5 px-4`, `flex-1 px-2.5 py-1.5 text-sm border...`, `px-3 py-1.5 text-sm font-medium bg-npb-accent`); placeholder dashed border → `border-2 border-dashed border-npb-border-default bg-npb-surface-raised`; hover overlay → `bg-black/55`; figcaption colors → `text-npb-text-muted`; empty state aspect ratio applied via `style` prop (needed for aspectRatio runtime value)
    - **post-toc**: inline CSS values for border/background/padding → CSS custom properties (`var(--npb-border-default)`, `var(--npb-surface-raised)`); link color hardcoded `#2563eb` → `text-npb-accent`; remaining inline styles for list geometry preserved (runtime-calculated paddingLeft)
  - **Notes**: No console.log or legacy renderer sections found in any post block. post-featured-image's UrlInputRow component converted from inline style objects to Tailwind classes with dark mode variant. post-toc renderer now uses design tokens for all static styles.
- [x] **5b: Media blocks** (7 blocks) — also remove debug logs, empty legacy comments
  - **Agent**: frontend-engineer
  - **Completed**: 2026-06-03
  - **Files**: image, video, audio, gallery, cover, media-text, file
  - **Changes per block**:
    - All Labels → `SettingsLabel` from shared utilities
    - Alignment/size buttons → token-based classes (`bg-npb-interactive-bg-active`, `border-npb-border-default`, etc.)
    - ImageBlock: added `getAlignmentButtonClass()` helper (token-based); Preview dashed border → `border-npb-border-strong`; all `text-gray-*` → `text-npb-text-muted`
    - VideoBlock: all Labels → `SettingsLabel`; alignment buttons → token-based; empty legacy renderer section removed
    - AudioBlock: all Labels → `SettingsLabel`; empty legacy renderer section removed
    - GalleryBlock: placeholder text `text-gray-400` → `text-npb-text-muted`; caption `text-gray-500` → `text-npb-text-muted`; empty legacy renderer section removed
    - CoverBlock: all Labels → `SettingsLabel`; color input border `border-gray-200` → `border-npb-border-default`; empty legacy renderer section removed
    - MediaTextBlock: all 12 Labels → `SettingsLabel`; empty legacy renderer section removed
    - FileBlock: all 7 Labels → `SettingsLabel`; placeholder `text-gray-400 border-gray-300` → `text-npb-text-muted border-npb-border-default`; file icon `text-gray-600` → `text-npb-text-secondary`; file details `text-gray-500` → `text-npb-text-muted`; empty legacy renderer section removed
  - **Notes**: No console.log found in any block. All 7 blocks now use design-reference tokens exclusively.
- [x] **5c: Layout blocks** (3 blocks) — also remove debug logs, empty legacy comments
  - **Agent**: frontend-engineer
  - **Completed**: 2026-06-03
  - **Files**: columns (750 LOC), container (577 LOC), group (706 LOC)
  - **Changes per block**:
    - **columns**: All `<Label>` → `<SettingsLabel>` (11 labels replaced); `text-gray-400` → `text-npb-text-muted` (drop placeholder); `text-gray-500` → `text-npb-text-muted` (3 hint texts); empty `// LEGACY RENDERER` section deleted (line 732); Import `SettingsLabel` from shared; Removed old `Label` import
    - **container**: No hardcoded colors found (already clean per earlier migration); all `Label` already use `npb-settings-label` CSS classes; TokenColorPicker already token-aware; Import `SettingsLabel` from shared (for completeness)
    - **group**: All `<Label>` → `<SettingsLabel>` (17 labels replaced); Layout preset buttons: `bg-blue-50 border-blue-300 text-blue-700` → `bg-npb-surface-raised border-npb-border-strong text-npb-accent` (active), `bg-white border-gray-200 hover:bg-gray-50` → `bg-npb-surface-base border-npb-border-default hover:bg-npb-interactive-bg-hover` (inactive); HTML tag buttons: `bg-gray-200 text-gray-800 border-gray-200` → `bg-npb-interactive-bg-active text-npb-text-primary border-npb-border-default` (active); Display type buttons same pattern; Grid hint text: `text-gray-500` → `text-npb-text-muted`; empty `// LEGACY RENDERER` section deleted (line 678); Import `SettingsLabel` from shared; Removed old `Label` import; Added missing `Input` and `Select` imports
  - **Notes**: All 3 layout blocks now use design-reference tokens. No hardcoded gray/white/black Tailwind colors remain. No debug console.log. Empty legacy renderer comment sections removed. Child block rendering logic unchanged. DnD logic in columns unchanged (only color/label changes).
- [x] **5d: Basic blocks** (13 blocks) — also remove debug logs, empty legacy comments
  - **Agent**: frontend-engineer
  - **Completed**: 2026-06-03
  - **Files**: button, buttons, separator, quote, list, pullquote, preformatted, table, code, html, markdown, icon (3 files), divider
  - **Changes per block**:
    - All `<Label className="text-sm font-medium text-gray-700">` → `<SettingsLabel>`
    - All hardcoded gray/white/black Tailwind colors → design tokens (`bg-npb-surface-*`, `text-npb-text-*`, `border-npb-border-default`)
    - Button/Position/Mode/Link Target buttons: `bg-gray-200 text-gray-800` → `bg-npb-interactive-bg-active text-npb-interactive-text-active`; `bg-white text-gray-700 border-gray-200` → `bg-npb-surface-base text-npb-text-secondary border-npb-border-default`
    - Icon preview container: `border border-gray-200 bg-gray-50` → `border border-npb-border-default bg-npb-surface-raised`
    - Table placeholder: `text-gray-400 border-gray-300` → `text-npb-text-muted border-npb-border-strong`
    - Markdown editor wrapper: `border-transparent hover:border-gray-200 focus-within:border-wp-blue` → `border-npb-border-default bg-npb-surface-base hover:border-npb-border-strong focus-within:ring-2 focus-within:ring-npb-focus`
    - HtmlBlock hint text: `text-gray-600` → `text-npb-text-muted`
    - PreformattedBlock hint text: `text-gray-600` → `text-npb-text-muted`
    - Color picker inputs: `border-gray-200` → `border-npb-border-default` (all instances)
    - Empty `// LEGACY RENDERER` sections deleted from all 13 blocks
    - No debug `console.log` found in any block
    - IconBlockSettings uses existing `npb-settings-*` classes (already migrated)
    - IconBlock.tsx and icon-block-model.ts: no hardcoded colors found (already clean)
  - **Notes**: All 13 blocks now use shared `SettingsLabel` and design-reference tokens. Empty legacy renderer comment sections removed from all blocks.
- **Agents**: 4× frontend-engineer (parallel, isolated scopes)
- **Notes**:

---

## Phase 6: Cleanup (Sequential) ✅
- [x] Delete `!important` overrides from `index.css`
- [x] Delete `.npb-editor-sidebar--light` class
- [x] Delete sidebar-local theme state remnants
- [x] Delete dead `.dark` sidebar shadcn tokens
- [x] Update `context.md`
- **Agent**: frontend-engineer
- **Notes**:
  - index.css: removed ~60 lines of `.npb-editor-sidebar .bg-white`, `.text-gray-*`, `.border-gray-*` etc. `!important` overrides (dark mode remaps, lines 329-416)
  - index.css: removed `.npb-editor-sidebar--light` class and all its `!important` overrides (~70 lines, lines 421-494)
  - index.css: removed `.npb-editor-sidebar.npb-editor-sidebar--light .npb-settings-btn-outline` override (line 575)
  - index.css: removed `.npb-editor-sidebar.npb-editor-sidebar--light` scrollbar override (line 161-164)
  - index.css: removed dead `.dark` sidebar shadcn tokens block (`:root` and `.dark` `--sidebar-*` vars, lines 230-249)
  - index.css: removed `.npb-editor-sidebar.npb-editor-sidebar--light` CSS vars block (lines 376-412)
  - BuilderSidebar.tsx: removed `cn` import and `isLight` derived state
  - BuilderSidebar.tsx: simplified all className variables to static dark-mode strings (removed `cn` + conditional `isLight` branches)
  - BuilderSidebar.tsx: sidebar now always uses dark chrome (consistent with Phase 1 spec — global `.dark` class handles theming)

---

## Phase 7: Complex Fixes (Separate Tasks)
- [x] 7a: Auto-save implementation — **already implemented** (spec doc was stale). Parent-level debounced auto-save in `PageBuilderEditor.queueDraftSave` (300ms → `savePageDraftWithHistory`); restore-on-reload at lines 204-262 (`loadPageDraft`, uses local draft when `localTs > remoteTs`). All acceptance criteria met.
- [x] 7b: Block deselection bug fix — **already implemented** (spec doc was stale). Dual-state + sync-effect removed; `PageBuilder.tsx:99` derives `blocks = currentState` directly; propBlocks handler only deselects when the selected block no longer exists (lines 121-124) — exactly the report's "Proposed Fix".
- [x] 7c: Columns/group/container 3-file split — each split into `*-model.ts` (data/helpers) + `*-settings.tsx` (settings UI) + `XBlock.tsx` (renderer + component + definition), per icon-block pattern. Main files now 267/160/115 LOC (all < 400). `buildColumnsLayout`/`removeColumnAndCleanup` re-exported from `ColumnsBlock.tsx` to keep `columnsBlock.test.ts` import path. No external importers of internals; registry default imports unchanged. Build passes; all 17 columns tests pass. Backups in `/backup/phase7/`; `intent.md` written.
- [x] 7d: TokenSpacingPicker decision — **deleted** (moved to `/trash/token-spacing-picker-20260603/`). Investigation: freeform CSS + `UnitToggle` is the universal spacing pattern (BlockSettings, ContainerBlock); `tokenMap` is used only for color. Wiring TokenSpacingPicker would lose `auto`/`calc()`/`%` and create a second spacing paradigm. Zero consumers — clean removal. (Approved by owner.)
- [x] 7e: Block library search — search input at top of `BlockLibrary.tsx`; filters by label/description/category (case-insensitive, `useMemo`); force-opens matching categories while searching; clear button + empty state. Build passes.
- [x] 7f: Keyboard shortcuts (Delete, Escape, Ctrl+D) — extended the existing mount-only keydown handler in `PageBuilder.tsx`. Delete/Backspace deletes selected block, Escape deselects, Ctrl/Cmd+D duplicates. Guarded behind a not-editable check (INPUT/TEXTAREA/SELECT/contentEditable) so typing/inline editing is never hijacked. Undo/redo/save unchanged. Build passes.
- [x] 7g: Visual drop placeholders + auto-scroll — DnD lib (`lib/dnd/index.tsx`): added `placeholderIndex` to `DroppableStateSnapshot` (additive, derived from existing over-index tracking) + exported reusable `DropPlaceholder` bar; rAF-based auto-scroll in the drag lifecycle (`findScrollableAncestor` + `performAutoScroll`, scrolls nearest scroll container or window near edges, cancelled on drop). Placeholder interleaved at the insertion index in all three drop paths: `BuilderCanvas` (canvas), `ColumnsRenderer` (columns), `ContainerChildren` (group/container). Build passes; full suite 453/453. Also fixed a stale theming-migration assertion in `HeadingBlock.test.tsx` (`bg-gray-200` → `bg-npb-interactive-bg-active`).
- [x] 7h: PublicBlockRenderer fixes — three hardcoded `#007cba` → `var(--npb-accent)` (buttons block, file link, file button); markdown now rendered via `react-markdown` + `remark-gfm` (lightweight, already deps; XSS-safe — renders React elements, ignores raw HTML) with new robust `getMarkdownContent` helper (handles `kind:"markdown"`/`"text"`/legacy `{content}` — previously returned empty). Chose react-markdown over MDEditor.Markdown to avoid a ~1.7MB public-bundle hit (owner-approved tradeoff).
- **Notes**: These are separate tasks, not part of theming migration. 7a/7b found already done during handoff verification (2026-06-03).

### Post-Phase-7 follow-up fixes (2026-06-04)
- **`SettingsLabel` type fix**: added optional `className` (merged via `cn`) to `shared/settings-label.tsx` — fixed 2 latent type errors that existed in the original columns/group settings (vite-build never typechecked them). All my files now `tsc`-clean; remaining 23 `tsc` errors are pre-existing in untouched files (Users/Register/Themes/shared placement/tests).
- **Oversized-block splits (blocks-report #2/#6/#8)** (2026-06-04): split the 10 remaining > 400 LOC blocks into the 3-file pattern (model + settings + main). post-list done directly; image, table, video, post-info, cover, media-text, post-comments, gallery, post-navigation delegated to 3 parallel frontend-engineer agents. All main files now < 400 LOC (145–339). post-author-box (385) and post-featured-image (340) already under 400 — no split. Verbatim moves, no re-exports needed (no external importers). Build green; tests 453/453. 2 pre-existing TS errors relocated verbatim (media-text-settings:86, video-settings:80 — were MediaTextBlock:243 / VideoBlock:319; not new).
- **Dev React crash from 7h's `react-markdown`** (dev-only; production build unaffected): root cause was a broken Vite HMR socket (`ws://localhost:undefined`) + react-markdown discovered lazily → second optimize pass → mismatched chunks → null React dispatcher. Triggered/exposed by **two duplicate `pnpm dev` servers** both bound to :5000. Fixes: killed the duplicate servers; `vite.config.ts` → `optimizeDeps.include: ["react-markdown","remark-gfm"]` (pre-bundle in first pass); `server/vite.ts` → `hmr.clientPort = parseInt(process.env.PORT||"5000",10)` (matches `server/index.ts:81`). Verified: single fresh `pnpm dev` loads clean, no hook errors.

---

## Backup
- Pre-theming backup: `/backup/client-src-pre-theming` (created before Phase 1)
