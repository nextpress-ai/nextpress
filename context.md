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

## 2026-05-15 — Block settings UX principles (editor)

Guidance for block sidebar settings (Page Builder and similar):

- **Prefer sensible dimension presets** (height auto, SM / MD / LG / full viewport, common max-widths aligned with page layout) **over blank freeform fields** as the primary control. Keep a **Custom** path with a real input for arbitrary CSS when the persisted model is still raw `styles` / CSS strings.
- **Avoid unusable empty-looking controls**: use labeled placeholders, preset chips (`npb-settings-chip` in sidebar), or selects so users see current mode. Where users edit **numeric lengths**, offer an explicit **px | rem** toggle that only activates for simple `number + unit` values so `calc()`, `%`, and multi-value shorthand are never blocked.
- **Reusable color UI**: text and background picks should **standardize on the same pattern as paragraph blocks** — `TokenColorPicker` in `client/src/components/PageBuilder/TokenColorPicker.tsx`, wired through `block.other.tokenMap` with `currentStyleValue` fallback from `block.styles` for legacy data. Extend that component or shared wrappers rather than inventing parallel color inputs per block.

### 2026-05-16 — Borders & contrast (editor settings)

- **Borders (sidebar settings)**: Avoid harsh stacked chrome. Prefer **hairlines** and **opacity-tiered** borders like `.npb-editor-sidebar` tokens in `client/src/index.css` (`--npb-coll-header-divider` / `--npb-settings-panel-border` / `--npb-chip-*`, collapsible card tier). Do not wrap every control in `.npb-settings-panel` when the parent is already a collapsible card — that reads as “card in card” with **double** hard edges; match **BlockSettings** (e.g. `TokenColorPicker` without an extra panel shell) unless a well is truly needed.
- **Contrast (summary)**: See repo root [`design-taste.md`](design-taste.md) for product-wide taste; in the builder sidebar, respect **shell vs panel vs card** separation via those CSS variables (hero / panel / collapsible / chip). Avoid **white-on-white** in dark chrome; keep **shadcn** primitives for controls but rely on **scoped** `.npb-editor-sidebar` remaps in `index.css` so fields and outlines stay legible on zinc surfaces.
