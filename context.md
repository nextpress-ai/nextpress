# Project context (agent handoff)

Per **AGENTS.md → Workflow**: use `task.md` for work **>30min**; at **task end**, update this file with **learnings, new patterns, tradeoffs** so future agents can pick up quickly.

---

## 2026-05-15 — Page builder editor UI (verified in workspace)

- **Editor sidebar shell**: `BuilderSidebar` root uses class `npb-editor-sidebar` (dark zinc chrome: `bg-zinc-950`, `border-zinc-700`, etc.).
- **BlockSettings tabs**: `TabsList` is **3 columns** — **Content** | **Style** | **Advanced**. **Display Conditions** (`ConditionBuilder`) lives only under **`TabsContent value="advanced"`**, not a top-level tab.
- **Contrast / dark chrome**: Workstream used **design-taste**-style passes; **repo artifact** = `client/src/index.css` — scoped `.npb-editor-sidebar` descendant overrides (remap light Tailwind grays/whites) + **`@layer utilities`** for inputs/selects/textarea/tablist (zinc fields, single focus ring). Comments in file describe intent.
- **Backups**: No `backup/` directory and no `*.20260514-contrast` files found in this workspace (if they exist locally, path may differ or be untracked).
- **Sidebar header (current code)**: Title string **`Nextpress Builder`**; adjacent **ghost** button calls **`onToggleSidebar`** (collapse/hide sidebar) — **not** a light/dark theme control.
- **Fold-all / “NextPress Editor” title / sidebar theme toggle**: **Not found** in `BuilderSidebar` / `PageBuilderEditor` via search; treat as **pending verify** if another agent is adding them elsewhere.

---

## 2026-05-15 — Local admin login (agent verification)

- **Purpose**: Hand off how agents can **re-verify** local admin sign-in without storing secrets in repo docs.
- **Base URL**: `http://localhost:5000` — HTTP port follows **`PORT`** when set; otherwise server defaults to **5000** (see `server/index.ts`).
- **Login path**: **`/admin/login`**
- **How verified**: Cursor **IDE browser MCP** was used to exercise the sign-in flow (credentials not recorded here).
- **Credentials**: **User-managed** (your machine / DB seed / owner). **Password**: ask project owner / use your own local user.
- **Security**: **No passwords, API keys, or session tokens** in `context.md` — treat this file as shareable context only.

---

## 2026-06-03 — Global Theming System Migration

Full report: [`docs/design-reference.md`](docs/design-reference.md)

### What Changed

- **Global token system**: ~40 CSS custom properties at `:root` (light) and `.dark` (dark) in `index.css`
- **Tailwind registration**: All tokens registered as `npb-*` colors in `tailwind.config.ts`
- **ThemeProvider**: `client/src/components/ThemeProvider.tsx` — manages `.dark` class on `<html>`, persists to `localStorage` key `npb-theme`
- **`useTheme()` hook**: Returns `{ theme, toggleTheme, isDark }`
- **Theme toggles**: TopBar (global sun/moon), Canvas header (canvas-only override)
- **Sidebar merged**: Removed local `useState<SidebarChromeTheme>`, now uses global `useTheme()`
- **Shared utilities**: `OptionButton`, `OptionGroup`, `SettingsLabel`, `SurfaceCard` in `client/src/components/PageBuilder/shared/`
- **All 36 blocks migrated**: Use tokens and shared utilities, no hardcoded Tailwind colors
- **All shell files migrated**: BuilderSidebar, TopBar, Canvas, Library, PageSettings, BlockSettings, TokenColorPicker, AnimationPicker
- **Legacy code removed**: `!important` overrides, `.npb-editor-sidebar--light`, sidebar-local theme state, dead `.dark` sidebar shadcn tokens

### Design Reference

All agents working on UI MUST read `/docs/design-reference.md` before making any UI changes. It contains:
- Complete token inventory with light/dark values
- Shared utility component APIs
- Design rules (borders, shadows, focus states, card structure, dividers)
- Motion & interaction guidelines
- Hardcoded → token migration map

---

## 2026-05-15 — Block settings UX principles (editor)

Guidance for block sidebar settings (Page Builder and similar):

- **Prefer sensible dimension presets** (height auto, SM / MD / LG / full viewport, common max-widths aligned with page layout) **over blank freeform fields** as the primary control. Keep a **Custom** path with a real input for arbitrary CSS when the persisted model is still raw `styles` / CSS strings.
- **Avoid unusable empty-looking controls**: use labeled placeholders, preset chips (`npb-settings-chip` in sidebar), or selects so users see current mode. Where users edit **numeric lengths**, offer an explicit **px | rem** toggle that only activates for simple `number + unit` values so `calc()`, `%`, and multi-value shorthand are never blocked.
- **Reusable color UI**: text and background picks should **standardize on the same pattern as paragraph blocks** — `TokenColorPicker` in `client/src/components/PageBuilder/TokenColorPicker.tsx`, wired through `block.other.tokenMap` with `currentStyleValue` fallback from `block.styles` for legacy data. Extend that component or shared wrappers rather than inventing parallel color inputs per block.

### 2026-05-16 — Borders & contrast (editor settings)

- **Borders (sidebar settings)**: Avoid harsh stacked chrome. Prefer **hairlines** and **opacity-tiered** borders like `.npb-editor-sidebar` tokens in `client/src/index.css` (`--npb-coll-header-divider` / `--npb-settings-panel-border` / `--npb-chip-*`, collapsible card tier). Do not wrap every control in `.npb-settings-panel` when the parent is already a collapsible card — that reads as “card in card” with **double** hard edges; match **BlockSettings** (e.g. `TokenColorPicker` without an extra panel shell) unless a well is truly needed.
- **Contrast (summary)**: See repo root [`design-taste.md`](design-taste.md) for product-wide taste; in the builder sidebar, respect **shell vs panel vs card** separation via those CSS variables (hero / panel / collapsible / chip). Avoid **white-on-white** in dark chrome; keep **shadcn** primitives for controls but rely on **scoped** `.npb-editor-sidebar` remaps in `index.css` so fields and outlines stay legible on zinc surfaces.

---

## 2026-06-03 — Blocks & Page Builder Audit (comprehensive)

Full report: [`docs/blocks-report.md`](docs/blocks-report.md)

### Key Findings

- **36 blocks registered** (26 core + 10 post), not 42 as README claims. README inflates "4 icon sets" as 4 blocks (it's 1 block with 4 icon libraries).
- **1 orphan block**: `post-new` (267 LOC) exists at `blocks/post-new/` but is NOT registered in `index.ts`. Unreachable.
- **Auto-save is FALSE** — README claims it exists but zero auto-save is implemented. Only manual Ctrl+S writes to localStorage.
- **Block deselection bug** — clicking any settings control deselects the block (race condition in `PageBuilder.tsx` between `useUndoRedo.currentState` and separate `useState`).

### Canonical Block Pattern (heading block as reference)

All blocks should follow `blocks/heading/HeadingBlock.tsx` structure:
1. TYPES → 2. CONSTANTS → 3. UTILITIES → 4. RENDERER (pure) → 5. MAIN COMPONENT (useBlockState → Renderer) → 6. SETTINGS (CollapsibleCard) → 7. BLOCK DEFINITION

Complex blocks (>400 LOC) should use icon block's 3-file split: `Block.tsx` + `block-settings.tsx` + `block-model.ts`.

### Settings Pattern Divergence

- **Pattern A** (26 core blocks): `setUpdateTrigger` force-render hack — heading block style
- **Pattern B** (10 post blocks): Direct accessor, reads stale `block.content` — post-title style
- **Recommendation**: Unify on Pattern A. Extract `useSettingsState(block)` hook to eliminate boilerplate.

### Reusability Gaps

- `TokenSpacingPicker` is **dead code** (0 consumers). BlockSettings uses `FreeformSpacingSideRow` instead.
- No `createBlockDefinition()` factory — 36 blocks repeat identical boilerplate.
- No shared `BlockShell` wrapper — every block builds className + styles + animation attrs independently.
- No shared `LinkSettings` or `MediaUrlField` — 6-7 blocks implement these independently.
- Renderer has parallel type system (`BlockData` vs `BlockConfig`) and parallel component set.

### 15 of 36 blocks exceed 400 LOC limit

Worst offenders: columns (754), group (710), container (577), post-list (561), image (515).

---

## 2026-06-03 — Phase 7 Complex Fixes (8 tasks complete)

Full spec: [`docs/phase7-tasks.md`](docs/phase7-tasks.md). Tracker: `task.md`.

### Corrections to earlier audit findings (the spec doc predated current code)

- **Auto-save IS implemented** (audit said FALSE). It lives at the **parent** level, not in `PageBuilder`: `PageBuilderEditor.queueDraftSave` (debounced 300ms → `savePageDraftWithHistory`), with restore-on-reload in the same file (`loadPageDraft`, uses local draft when `localTs > remoteTs`). `PageBuilder.commitBlocks → onBlocksChange → handleBlocksChange → queueDraftSave`.
- **Block deselection bug IS fixed** (audit described the race). `PageBuilder.tsx` no longer keeps dual state — `const blocks = currentState` (direct derivation); the propBlocks handler only deselects when the selected block no longer exists. If you see the audit's `useEffect(() => setBlocks(currentState))`, it's gone.

### New patterns / decisions

- **Spacing UX is freeform CSS + `UnitToggle`, NOT token chips.** Both `BlockSettings` (`FreeformSpacingSideRow`) and `ContainerBlock` write raw CSS to `block.styles`. `tokenMap` is used **only for color** (`TokenColorPicker`). `TokenSpacingPicker` was the last survivor of an abandoned token-spacing approach → **deleted** to `/trash/token-spacing-picker-20260603/`. Don't reintroduce token-chip spacing; it loses `auto`/`calc()`/`%` and forks the pattern.
- **Layout-block 3-file split** (icon-block pattern): columns/group/container each → `*-model.ts` (types/defaults/pure helpers, no React) + `*-settings.tsx` (settings UI) + `XBlock.tsx` (renderer + component + default-export `BlockDefinition`). Registry imports the default export, so split is internal. NB: the **main** `XBlock.tsx` must be < 400 LOC; settings files may be larger (reference `icon-block-settings.tsx` is 451). Tests importing `buildColumnsLayout`/`removeColumnAndCleanup` still work via a re-export from `ColumnsBlock.tsx`.
- **Markdown rendering**: public renderer uses `react-markdown` + `remark-gfm` (both already deps; XSS-safe — renders React elements, ignores raw HTML). Chose this over `MDEditor.Markdown` to avoid a ~1.7MB public-bundle hit (the editor preview still uses `MDEditor.Markdown`). `getMarkdownContent` handles `kind:"markdown"`/`"text"`/legacy `{content}`.
- **Custom DnD lib** (`lib/dnd/index.tsx`): the over-target index is tracked in `overState.index`; now surfaced as `DroppableStateSnapshot.placeholderIndex`. Consumers render the exported `DropPlaceholder` at that index (interleaved in `BuilderCanvas`, `ColumnsRenderer`, `ContainerChildren`). Auto-scroll is an rAF loop in the drag lifecycle (`findScrollableAncestor` → nearest scrollable, else window). All three drop paths already render `{provided.placeholder}`.
- **Keyboard shortcuts**: handled in `PageBuilder`'s mount-only keydown listener. Delete/Backspace/Escape/Ctrl+D are **guarded** against `INPUT/TEXTAREA/SELECT/contentEditable` so inline editing is never hijacked; undo/redo/save remain unguarded (existing behavior).

### Verification

Build green; full suite **453/453**. Fixed one stale theming-migration assertion in `HeadingBlock.test.tsx` (`bg-gray-200` → `bg-npb-interactive-bg-active`). UI behaviors (drag placeholder/auto-scroll, public markdown, in-app shortcuts) are build/test-verified only — still want a manual in-app pass. Backups in `/backup/phase7/`.

### Dev-server gotchas (learned 2026-06-04)

- **One `pnpm dev` at a time.** Two instances both bind `0.0.0.0:5000` (no port-in-use error) and corrupt Vite HMR port resolution → client tries `ws://localhost:undefined` → HMR/auto-reload dead. If HMR acts up, check `ps aux | grep "server/index"` for duplicates first.
- **HMR client port is now pinned**: `server/vite.ts` sets `hmr: { server, clientPort: parseInt(process.env.PORT||"5000",10) }` (mirrors the listen port in `server/index.ts:81`). Previously `hmr: { server }` alone could inject `ws://localhost:undefined`.
- **Adding a new React-using dep** (e.g. `react-markdown`) that isn't in `optimizeDeps.include` gets discovered lazily mid-load → a 2nd optimize pass → mismatched `?v=` chunk hashes → `Cannot read properties of null (reading 'useEffect')` app-wide (dev only; prod build dedupes fine). Fix: add it to `optimizeDeps.include` in `vite.config.ts` (react-markdown + remark-gfm already added).
- **Debugging tip**: `agent-browser` reproduced this — `open <url>` then `errors --json` / `console` surfaced the broken HMR ws + null-React stack pointing at `node_modules/.vite/deps/*` chunks with differing `?v=` hashes.
