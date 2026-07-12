# NextPress Design System

> **Single source of truth** for all UI/UX work in NextPress — character, theory, taste, patterns, tokens, and code conventions.  
> **Mandatory:** read this before changing admin UI, page builder chrome, or block settings.

Technical specs for *block token resolution* (published page CSS) live separately in [`tailwind-token-system-spec.md`](./tailwind-token-system-spec.md). That doc is about **user content styling**, not admin/editor chrome.

---

## Table of contents

1. [What this document is](#1-what-this-document-is)
2. [Product character](#2-product-character)
3. [UX guidelines](#3-ux-guidelines)
4. [Design theory](#4-design-theory)
5. [Taste dials & rules](#5-taste-dials--rules)
6. [Visual language](#6-visual-language)
7. [Patterns](#7-patterns)
8. [Motion & interaction](#8-motion--interaction)
9. [Accessibility & contrast](#9-accessibility--contrast)
10. [Token system](#10-token-system)
11. [CSS utility classes](#11-css-utility-classes)
12. [Shared components](#12-shared-components)
13. [Coding rules](#13-coding-rules)
14. [Migration map](#14-migration-map)
15. [Theme architecture](#15-theme-architecture)
16. [Builder sidebar](#16-builder-sidebar)
17. [Decision checklist](#17-decision-checklist)
18. [Page builder & publish parity](#18-page-builder--publish-parity)
19. [Control philosophy: presets first](#19-control-philosophy-presets-first)
20. [File locations](#20-file-locations)

---

## 1. What this document is

A design system is **shared intent** — how the product should *feel*, *behave*, and *decide* — not only hex codes.

| Layer | Question it answers |
|---|---|
| **Character** | What kind of tool is this? |
| **Theory** | Why compose UI this way? |
| **Taste** | When two options are valid, which do we prefer? |
| **Patterns** | How do shells, lists, cards, modals behave? |
| **Foundations** | Tokens, classes, files — the vocabulary |
| **Verification** | Did we hit the bar? (`client/src/lib/design-contrast/`) |

If you only copy token classes, you know *what* to paste — not *why* or *when to break a rule*.

---

## 2. Product character

NextPress is a **professional CMS workbench** — WordPress-familiar, Node/React-native, built for people who edit for hours.

**Should read as:**

- **Instrument, not brochure** — density where work happens; air where decisions happen.
- **Calm authority** — dark persistent chrome (admin bar, editor header) anchors the session; workspace follows theme.
- **Digital-first** — software layers, not paper cards on a desk.
- **Honest hierarchy** — chrome → workspace → canvas → block → content.

**Should not read as:**

- Marketing landing page (hero symmetry, gradient CTAs, badge soup)
- Generic shadcn demo (every control in its own bordered card)
- Theme playground (inconsistent light/dark pockets)

**Squint test:** three planes visible — **chrome**, **workspace**, **focus target** — not a grid of identical boxes.

---

## 3. UX guidelines

Practical rules for every screen:

1. **Intuitive & familiar** — WordPress-adjacent patterns; don't make users guess.
2. **Digital-first** — desktop/app optimization; spacious where decisions happen, efficient where work repeats.
3. **Micro-interactions** — motion only when it delights or gives feedback (see §8 frequency test).
4. **Spacious layouts** — tabs, accordions, segmented UI over walls of text; icons where labels repeat.
5. **Clean aesthetics** — no gradients, sparkles, glows, or heavy shadows unless explicitly requested.
6. **Consistency** — same padding rhythm, same surface steps, same header pattern across admin pages.
7. **Strong typography** — clear weight jumps between title, section, body, meta.
8. **Themed experience** — intentional light/dark; chrome stays dark; workspace follows global theme.
9. **Responsive & adaptive** — admin usable on laptop-first; modals and tables scroll on small viewports.
10. **Anticipatory UX** — primary action obvious; next step easy (one primary button per header region).
11. **Functional efficiency** — minimum UI items for ≥90% of tasks; tables and cards earn their space.
12. **Progressive disclosure** — settings in tabs; table rows hold identifiers; detail in editor/modal.
13. **Inputs** — min height `h-9`, comfortable padding; **one** focus mechanism (ring *or* border), never stacked.
14. **Tables** — paginate/filter; don't cram detail into cells; row actions for drill-down.
15. **Modals** — full-width header band, title + close, scroll body, footer with cancel + primary; title alone is enough — no explainer paragraph.
16. **Don't pack chrome** — title, actions, subtitle, and close each get space; use dividers between sections.

---

## 4. Design theory

Use these when choosing between two implementations.

### Hierarchy

Scan order: *where am I → what can I do → what is the object*.  
Hierarchy = **size, weight, shade, placement** — not more borders.

- Page title > section > row primary > row meta > hint
- One primary action per viewport region

### Contrast (visual + accessible)

Contrast = **separation of planes**, not only WCAG ratios.

- Adjacent surfaces differ by a visible shade step
- Text on surfaces must pass WCAG AA — verify with contrast utility when changing tokens
- Accent color is scarce — hierarchy must work in grayscale

### Unity & similarity

Same job → same skeleton (header band, content pad, footer actions).  
Pages, Posts, Users lists should feel like siblings.

### Balance & proportion

Admin: title/nav left, utilities right. Canvas: page centered as protagonist.

### Emphasis & progressive disclosure

Tables hold identifiers; detail in row actions or editor. Settings use tabs, not infinite card scroll.

### Dividers over nesting

**No card-in-card.** One surface + dividers + shade steps.  
Don't wrap every control in `.npb-settings-panel` inside an already-bordered collapsible — double edges.

### Surface distinction

Headers and embedded bands must read as a **different plane** from body content.  
Dark sidebar + themed main is intentional — not everything must be uniform white or uniform dark.

---

## 5. Taste dials & rules

NextPress calibration (admin + editor):

| Dial | Value | Meaning |
|---|---|---|
| Design variance | **4** | Predictable admin layouts; asymmetry for public site, not dashboard |
| Motion intensity | **3** | Static-first; hover/press only in chrome |
| Visual density | **5** | Daily-app efficiency; not art-gallery airy, not cockpit cramped |

**When in doubt:**

1. **Remove before decorate** — duplicate quick actions, welcome banners, dev-feature essays.
2. **Shade before border** — try `surface-raised` on `canvas-bg` before `border-gray-200`.
3. **One accent story** — blue for links, focus, selection, primary; status colors for semantics only.
4. **Chrome stays dark** — admin top bar + editor header ignore theme toggle.
5. **Hover must belong** — same material family (emphasis darkens slightly; ghost gets wash; canvas blocks get accent outline).
6. **No blur as crutch** — solid toolbar surfaces, not frosted overlays on blocks.
7. **Obvious UI needs no caption** — modal title yes; paragraph explaining the modal no.
8. **No colored border on one end of a card** — uniform treatment or shade only.

---

## 6. Visual language

### Depth model

```
canvas-bg           workspace ground
  surface-base      panel / main column
    surface-raised  card / tile
      surface-inset wells, tab tracks, inputs
        surface-header  section band (optional)
```

Each step ≈ one perceptual click. If neighbors look the same, fix shade — don't add a border.

### Color

- **Neutrals:** zinc only — don't mix warm/cool grays in one shell.
- **Accent:** one blue (`npb-accent`).
- **Status:** success / warning / error / info tokens — never reuse accent for success.
- **Emphasis:** inverted neutral for rare chrome CTAs (Page menu) — not every button.

### Shape

- Surfaces: `--npb-radius-surface` = **0.5rem**
- Controls: `--npb-radius-input` = **0.375rem**
- Full-width header bands can stay flush; corners soften panels and buttons.

### Typography

| Role | Treatment |
|---|---|
| Page title | Semibold, `text-2xl`, tight tracking |
| Section title | Semibold, `text-lg` |
| Body | Regular, `text-npb-text-primary` |
| Label | Medium, `text-npb-text-secondary` via `SettingsLabel` |
| Meta / hint | `text-npb-text-muted`, smaller |
| Table numbers | Tabular nums where aligned |

No marketing display type in admin.

### Space

Base unit **4px**. Common: 8, 12, 16, 24, 32.

- Page content: `p-6` (24px)
- Card body: 16–24px
- Section gaps: 24–32px
- Related controls: 8–12px

---

## 7. Patterns

### Shells

| Shell | Chrome | Workspace |
|---|---|---|
| **Admin** | Dark top bar + dark sidebar | Theme-aware `AdminLayout` main |
| **Editor** | Dark header (Back, Save, Site settings) | Sidebar + canvas + builder top bar |
| **Canvas** | Builder top bar | Gray field + themed "page" surface |

Theme toggle: admin top bar + builder top bar. Editor chrome header **never** flips theme.

### Admin page header

Title left, actions right, shade step from content — not white strip + hard border. Max **one** filled primary in header.

### Lists (pages, posts, users, …)

Filter row → **one** raised surface → table. Don't repeat page title inside the card. Row actions: ghost icons; destructive on confirm.

### Dashboard

Metrics row → primary work (recent items) → secondary panel (theme). No welcome banner duplicating header actions.

### Cards

When elevation marks a **bounded object**. Optional `surface-header` band → body → optional footer. **Never** nest cards — use `divide-y divide-npb-divider`.

### Modals

Header band (title + close, optional icon) → scrollable body → footer (cancel + primary). Responsive; body scrolls on small screens.

### Builder canvas

- **Hover:** `.npb-canvas-block-hover` — accent inset outline
- **Selection:** `.block-ring-fade` — brief accent ring, then fade
- **Toolbar:** `.npb-canvas-toolbar` — solid surface on block top
- **Page button:** `.npb-interactive-emphasis` in builder top bar

### Forms (settings / block sidebar)

- Label **above** input (`SettingsLabel`)
- Helper optional; error below field
- Preset chips / selects over blank freeform where sensible (`npb-settings-chip`)
- Color picks: `TokenColorPicker` + `tokenMap` — don't invent parallel color UIs per block

### Empty & loading

One line + one action for empty. Skeleton matching layout — not lone spinner in void.

---

## 8. Motion & interaction

### Frequency test (ask before animating)

| How often | Examples | Decision |
|---|---|---|
| 100+/day | Block select, sidebar tab, undo | **No animation** |
| Often | Hover, list row | ≤200ms, transform/opacity only |
| Occasional | Modal, dialog | 200–300ms ease-out |
| Rare | First publish | Delight allowed |

**Never animate keyboard-initiated actions.**

### Durations

| Element | Duration |
|---|---|
| Button press | 100–160ms |
| Tooltip / popover | 125–200ms |
| Dropdown | 150–250ms |
| Modal / drawer | 200–500ms |

UI animations **under 300ms** unless rare/delightful.

### Easing

**Never `ease-in` on dropdowns** — feels sluggish.

| Context | Token / curve |
|---|---|
| Enter / respond | `--npb-ease-out` `cubic-bezier(0.23, 1, 0.32, 1)` |
| On-screen move | `--npb-ease-in-out` `cubic-bezier(0.77, 0, 0.175, 1)` |
| Hover / color | `ease` |

### Press feedback

```css
transition: transform 160ms var(--npb-ease-out);
&:active { transform: scale(0.97); }
```

### Entry animations

- Start `scale(0.95)` + `opacity: 0` — not `scale(0)`
- Stagger lists 30–80ms if mounting many items
- Exit faster than enter

### Performance

- Animate **only** `transform` and `opacity`
- Never animate `top`, `left`, `width`, `height`, `margin`, `padding`
- `will-change: transform` only while animating
- `backdrop-blur` only on fixed chrome — not scrolling toolbars

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Keep opacity/color state changes; remove movement.

### Touch hover

```css
@media (hover: hover) and (pointer: fine) {
  .npb-interactive-emphasis:hover { ... }
}
```

### Z-index layers

| Layer | Z | Use |
|---|---|---|
| Content | `z-0` | Default |
| Sticky chrome | `z-10` | Top bars |
| Dropdowns | `z-20` | Menus, tooltips |
| Modals | `z-30` | Dialogs |
| Toasts | `z-40` | Sonner |
| Drag ghost | `z-50` | DnD |

No `z-[9999]`.

### Tooltips

300–500ms initial delay; instant when adjacent tooltip already open. 125–200ms show, ease-out.

### Keyboard hints

```tsx
<kbd className="px-1.5 py-0.5 text-xs font-mono border border-npb-border-default rounded-[var(--npb-radius-input)] bg-npb-surface-raised text-npb-text-secondary">
  Ctrl+S
</kbd>
```

---

## 9. Accessibility & contrast

Accessible UI **is** good hierarchy:

- Muted text passes **AA** on its surface (4.5:1 body, 3:1 large/UI)
- Focus: one visible mechanism, accent family
- Hit targets ≥36px builder chrome; ≥44px touch-primary flows
- Reduced motion: shorten, don't zero-out state change

### Contrast utility

`client/src/lib/design-contrast/`

```ts
import { measureContrast, suggestContrastAdjustment } from '@/lib/design-contrast';

measureContrast({
  foreground: '#71717a',
  background: '#ffffff',
  level: 'aa-normal',
});

suggestContrastAdjustment({
  foreground: '#d4d4d8',
  background: '#ffffff',
  level: 'aa-normal',
});
// → adjustRole, suggestedHex, tailwind: { family, fromStep, toStep, direction, steps }
```

Run when adding/changing text tokens, emphasis buttons, or canvas hover colors. The utility **verifies** — taste picks the pattern first.

---

## 10. Token system

**Never hardcode** `bg-white`, `text-gray-700`, `border-gray-200`. Use `npb-*` tokens.

Defined in `client/src/index.css` (`:root` + `.dark`). Registered in `tailwind.config.ts`.

### Surfaces

| Token | Class | Light | Dark |
|---|---|---|---|
| `--npb-surface-base` | `bg-npb-surface-base` | `#ffffff` | `#09090b` |
| `--npb-surface-raised` | `bg-npb-surface-raised` | `#f9fafb` | `#18181b` |
| `--npb-surface-inset` | `bg-npb-surface-inset` | `#f3f4f6` | `#27272a` |
| `--npb-surface-overlay` | `bg-npb-surface-overlay` | `#ffffff` | `#18181b` |
| `--npb-surface-header` | `bg-npb-surface-header` | `#f3f4f6` | `#27272a` |
| `--npb-canvas-bg` | `bg-npb-canvas-bg` | `#f3f4f6` | `#18181b` |
| `--npb-canvas-page` | `bg-npb-canvas-page` | `#ffffff` | `#27272a` |

### Text (AA-tuned on surface-base)

| Token | Class | Light | Dark |
|---|---|---|---|
| `--npb-text-primary` | `text-npb-text-primary` | `#18181b` | `#fafafa` |
| `--npb-text-secondary` | `text-npb-text-secondary` | `#52525b` | `#d4d4d8` |
| `--npb-text-muted` | `text-npb-text-muted` | `#71717a` | `#a1a1aa` |
| `--npb-text-inverse` | `text-npb-text-inverse` | `#fafafa` | `#18181b` |

### Borders & dividers (prefer shade over these)

| Token | Light | Dark |
|---|---|---|
| `--npb-border-default` | `rgb(0 0 0 / 0.06)` | `rgb(255 255 255 / 0.08)` |
| `--npb-border-subtle` | `rgb(0 0 0 / 0.03)` | `rgb(255 255 255 / 0.04)` |
| `--npb-border-strong` | `rgb(0 0 0 / 0.10)` | `rgb(255 255 255 / 0.14)` |
| `--npb-divider` | `rgb(0 0 0 / 0.05)` | `rgb(255 255 255 / 0.06)` |

### Interactive

| Token | Purpose |
|---|---|
| `interactive-bg` / `-hover` / `-active` | Ghost buttons, tabs, rows |
| `interactive-text` / `-active` | Labels on interactive surfaces |
| `interactive-emphasis-bg` / `-hover` / `-text` | Inverted chrome CTAs |

### Canvas interaction

| Token | Purpose |
|---|---|
| `--npb-canvas-block-hover-outline` | Block hover inset ring |
| `--npb-canvas-block-toolbar-bg` | Solid block toolbar |
| `--npb-canvas-block-toolbar-border` | Toolbar hairline |

### Accent & focus

| Token | Light | Dark |
|---|---|---|
| `--npb-accent` | `#3b82f6` | `#60a5fa` |
| `--npb-accent-hover` | `#2563eb` | `#3b82f6` |
| `--npb-focus-ring` | `#3b82f6` | `#60a5fa` |

### Status

| Token | Light | Dark |
|---|---|---|
| success | `#22c55e` | `#4ade80` |
| warning | `#f59e0b` | `#fbbf24` |
| error | `#ef4444` | `#f87171` |
| info | `#3b82f6` | `#60a5fa` |

### Shape, shadow, motion tokens

| Token | Value |
|---|---|
| `--npb-radius-surface` | `0.5rem` |
| `--npb-radius-input` | `0.375rem` |
| `--npb-shadow-surface` | subtle depth only |
| `--npb-ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` |
| `--npb-ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` |
| `--npb-duration-fast` | `100ms` |
| `--npb-duration-normal` | `200ms` |
| `--npb-duration-slow` | `400ms` |

---

## 11. CSS utility classes

| Class | Use |
|---|---|
| `.admin-top-bar` | Always-dark admin bar |
| `.admin-shell` / `AdminLayout` | Theme-aware admin main |
| `.npb-editor-chrome-header` | Always-dark editor header + input/button overrides |
| `.npb-interactive-emphasis` | Page button, inverted primary |
| `.npb-interactive-ghost` | Ghost hover on chrome |
| `.npb-canvas-block-hover` | Block hover outline |
| `.npb-canvas-toolbar` | Block toolbar surface |
| `.npb-editor-sidebar` | Builder sidebar scope (see §16) |

---

## 12. Shared components

`client/src/components/PageBuilder/shared/`

### `OptionButton` / `OptionGroup`

Toggle options (heading level, alignment). Replaces duplicated `getOptionButtonClassName()`.

### `SettingsLabel`

Standard control label + optional hint. Replaces `text-sm font-medium text-gray-700`.

### `SurfaceCard`

Raised surface with optional header. Replaces `bg-white border border-gray-200 rounded-lg`.

```tsx
<SurfaceCard header={{ title: 'Settings', actions: <Button>Save</Button> }}>
  Content
</SurfaceCard>
```

### `AdminLayout`

Admin shell: dark chrome + themed main. Props: `title`, `actions`, `children`.

---

## 13. Coding rules

### Do

- Prefer `divide-npb-divider` and shade steps over card borders
- Cards: `border-0 bg-npb-surface-raised shadow-[var(--npb-shadow-surface)]`
- Focus: `ring-2 ring-npb-focus ring-offset-1` — one mechanism
- Inputs: min `h-9`; label above field
- Color scarcity — accent for action/selection/status only

### Don't (anti-patterns)

- ❌ Gradients, sparkles, glows, heavy shadows
- ❌ Hardcoded Tailwind grays on admin/builder chrome
- ❌ Card-in-card nesting
- ❌ Colored border on one card edge only
- ❌ Title + actions + close packed in one corner
- ❌ Badges for decoration
- ❌ Frosted blur on block toolbars
- ❌ Hover that jumps to unrelated token (gray wash on inverted button)
- ❌ `z-[9999]`

---

## 14. Migration map

| Old | New |
|---|---|
| `bg-white` | `bg-npb-surface-base` or `SurfaceCard` |
| `bg-gray-50` | `bg-npb-surface-raised` |
| `bg-gray-100` | `bg-npb-surface-inset` or `bg-npb-canvas-bg` |
| `bg-gray-200` (active) | `bg-npb-interactive-bg-active` |
| `text-gray-400` / `500` | `text-npb-text-muted` |
| `text-gray-600` / `700` | `text-npb-text-secondary` or `SettingsLabel` |
| `text-gray-800` / `black` | `text-npb-text-primary` |
| `border-gray-200` | `border-npb-border-default` or shade step |
| `border-gray-300` | `border-npb-border-strong` |
| `ring-blue-500` | `ring-npb-focus` |
| `getOptionButtonClassName()` | `OptionButton` |
| Admin shell boilerplate | `AdminLayout` |

---

## 15. Theme architecture

- **Toggle:** `.dark` on `<html>`
- **Provider:** `client/src/components/ThemeProvider.tsx` — `localStorage` key `npb-theme`
- **Hook:** `useTheme()` → `{ theme, toggleTheme, isDark }`

| Region | Follows theme? |
|---|---|
| Admin top bar | **No** — always dark |
| Admin sidebar | **No** — always dark |
| Admin main content | **Yes** |
| Editor chrome header | **No** — always dark |
| Builder sidebar / canvas / top bar | **Yes** |

### shadcn + `.dark` ordering gotcha

Light shadcn vars live in a second `:root {}` after the first `.dark {}` npb block. **Dark shadcn overrides must be in a second `.dark {}` placed after that `:root` block**, or `--background`, `--muted`, `--card` stay light while npb tokens flip — breaks outline buttons, selects, and tabs in the builder.

---

## 16. Builder sidebar

Class: `.npb-editor-sidebar` on `BuilderSidebar` root.

- Scoped descendant overrides in `index.css` remap shadcn/Tailwind grays for theme-aware sidebar
- Separate tiers: shell → panel → collapsible → chip (`--npb-sidebar-*` vars)
- Avoid **card-in-card** in block settings — match BlockSettings pattern (no extra panel shell inside collapsible)
- Use `TokenColorPicker` for colors; preset chips for dimensions
- Sidebar follows **global theme** — no local sidebar theme toggle

---

## 17. Decision checklist

Before shipping UI:

1. **Squint** — three planes visible?
2. **Duplicate** — action/copy elsewhere on screen?
3. **Card** — divider or shade instead?
4. **Grayscale** — hierarchy without accent?
5. **Hover** — same material family?
6. **Frequency** — should this animate?
7. **Contrast** — new pairs pass AA?

Fix the pattern — don't add another one-off token.

---

## 18. Page builder & publish parity

NextPress has **two render trees**. Do not mix them up.

| Path | Code | Used for |
|---|---|---|
| **Editor canvas** | `client/src/components/PageBuilder/blocks/*` via `BlockRenderer` | Drag, drop, inline edit, settings |
| **Preview & publish** | `renderer/react/*` via `PublicBlockRenderer` / `PublicBlockStack` | Preview tab, published pages, SSR |

**Rule:** If it looks wrong on preview or the live site, fix `renderer/react/*` (and shared helpers both paths use). Editor-only components do not affect visitors.

### Preview must match the canvas

- **Preview from the editor** passes live blocks through `sessionStorage` (`shared/preview-session.ts`, `?live=1` on preview URL). Do not rely on the API alone immediately after edit.
- **Shared layout helpers** (`shared/gallery-render.ts`, `shared/group-shell-styles.ts`, `shared/form-field-model.ts`) prevent editor/publish drift.
- **Fontsource (self-hosted):** catalog fonts are bundled via `@fontsource/*` packages. SPA loads `client/src/styles/bundled-fonts.css` from `main.tsx`. SSR/publish links `/assets/css/bundled-fonts.css` (run `pnpm build:fonts`). Catalog lives in `shared/font-catalog.ts`; pickers use `BLOCK_FONT_CATALOG` / `PAGE_FONT_CATALOG`.

### Content vs styles (blocks)

- **Content tab** = semantics only (text, URLs, tags, image alt, gallery images).
- **Style tab** = all visual CSS (layout, colors, spacing, borders, hover states, custom CSS).
- Never write layout CSS into `content.data` from the editor or SDK.

### Known parity checkpoints

- Gallery grid: `display: grid` + `blocks-gallery-grid` in both trees; SSR fallback CSS in `GALLERY_PUBLISH_CSS`.
- Form fields: publish-safe default colors (hex, not admin CSS variables); `wp-block-input__control` for hover selectors.
- Hover colors: `TokenEntry.modifier: "hover"` via Style tab pickers; button/form modifier selectors in `shared/*-block-styles.ts`.

---

## 19. Control philosophy: presets first

Settings panels should feel like **Tailwind-style presets**, not raw CSS worksheets.

| Prefer | Over |
|---|---|
| Chips: SM / MD / LG / XL | Freeform `padding: 0 2px 0 4px` as the only control |
| Font weight: Light / Normal / Bold | Raw `500`, `700` unless user opens custom |
| Corner shape: Square / Rounded / Pill / Circle | Only a `border-radius` text field |
| Width: Fill / Fit / Max | Arbitrary `%` without presets |
| Spacing presets in `shared/dimension-presets.ts` | One-off values in every block settings file |

**Pattern:** show preset chips first; keep a **single custom field** below as escape hatch (labeled “Custom …”). Page-level and block-level font lists stay in sync via `shared/font-catalog.ts` (`BLOCK_FONT_CATALOG` / `PAGE_FONT_CATALOG`).

When adding a new style control, add presets to `shared/dimension-presets.ts` (or block model) before exposing raw inputs.

---

## 20. File locations

| What | Where |
|---|---|
| **This document** | `docs/design-system.md` |
| CSS tokens | `client/src/index.css` |
| Tailwind `npb-*` | `tailwind.config.ts` |
| ThemeProvider | `client/src/components/ThemeProvider.tsx` |
| AdminLayout | `client/src/components/AdminLayout.tsx` |
| Shared UI | `client/src/components/PageBuilder/shared/` |
| Contrast API | `client/src/lib/design-contrast/` |
| Block content tokens (spec) | `docs/tailwind-token-system-spec.md` |
| Font catalog (picker + Fontsource ids) | `shared/font-catalog.ts` |
| Bundled font CSS (SPA import) | `client/src/styles/bundled-fonts.css` |
| Bundled font CSS (SSR static) | `client/public/assets/css/bundled-fonts.css` (`pnpm build:fonts`) |
