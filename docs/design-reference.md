# Design Reference — Nextpress Builder

> **MANDATORY** for all agents working on UI components. This is the single source of truth for theming, tokens, and design patterns. Do not invent new color patterns — use what's defined here.

---

## Token System

All UI components use semantic tokens. **Never use hardcoded Tailwind colors** (`bg-white`, `text-gray-700`, `border-gray-200`). Use tokens instead.

### CSS Custom Properties

Defined in `client/src/index.css` at `:root` (light) and `.dark` (dark). Registered in `tailwind.config.ts` as `npb-*` colors.

### Surface Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-surface-base` | `bg-npb-surface-base` | Main backgrounds | `#ffffff` | `#09090b` |
| `--npb-surface-raised` | `bg-npb-surface-raised` | Cards, elevated elements | `#f9fafb` | `#18181b` |
| `--npb-surface-inset` | `bg-npb-surface-inset` | Inset wells, code blocks | `#f3f4f6` | `#27272a` |
| `--npb-surface-overlay` | `bg-npb-surface-overlay` | Popovers, dialogs | `#ffffff` | `#18181b` |
| `--npb-surface-header` | `bg-npb-surface-header` | Card/panel headers | `#f3f4f6` | `#27272a` |

### Text Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-text-primary` | `text-npb-text-primary` | Headings, body text | `#18181b` | `#fafafa` |
| `--npb-text-secondary` | `text-npb-text-secondary` | Labels, descriptions | `#374151` | `#a1a1aa` |
| `--npb-text-muted` | `text-npb-text-muted` | Placeholders, hints | `#9ca3af` | `#71717a` |
| `--npb-text-inverse` | `text-npb-text-inverse` | Text on dark surfaces | `#fafafa` | `#18181b` |

### Border & Divider Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-border-default` | `border-npb-border-default` | Standard borders | `#e5e7eb` | `#3f3f46` |
| `--npb-border-subtle` | `border-npb-border-subtle` | Dividers, hairlines | `#f3f4f6` | `#27272a` |
| `--npb-border-strong` | `border-npb-border-strong` | Emphasized borders | `#d1d5db` | `#52525b` |
| `--npb-divider` | `border-npb-divider` | Section dividers | `#e5e7eb` | `#3f3f46` |

### Interactive Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-interactive-bg` | `bg-npb-interactive-bg` | Button/chip resting | `#ffffff` | `#27272a` |
| `--npb-interactive-bg-hover` | `bg-npb-interactive-bg-hover` | Button/chip hover | `#f9fafb` | `#3f3f46` |
| `--npb-interactive-bg-active` | `bg-npb-interactive-bg-active` | Button/chip selected | `#e5e7eb` | `#3f3f46` |
| `--npb-interactive-text` | `text-npb-interactive-text` | Button/chip text | `#374151` | `#a1a1aa` |
| `--npb-interactive-text-active` | `text-npb-interactive-text-active` | Active button text | `#18181b` | `#fafafa` |

### Canvas Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-canvas-bg` | `bg-npb-canvas-bg` | Canvas surround | `#f3f4f6` | `#18181b` |
| `--npb-canvas-page` | `bg-npb-canvas-page` | Page surface | `#ffffff` | `#27272a` |

### Accent & Focus Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-accent` | `text-npb-accent`, `bg-npb-accent` | Links, primary actions | `#3b82f6` | `#60a5fa` |
| `--npb-accent-hover` | `hover:bg-npb-accent-hover` | Hover on accent | `#2563eb` | `#3b82f6` |
| `--npb-focus-ring` | `ring-npb-focus` | Focus rings | `#3b82f6` | `#60a5fa` |

### Shape Tokens

| Token | Value | Purpose |
|---|---|---|
| `--npb-radius-surface` | `0` | Cards, panels, tables — **sharp corners** |
| `--npb-radius-input` | `0.375rem` | Buttons, inputs — rounded |

### Shadow Tokens

| Token | Purpose |
|---|---|
| `--npb-shadow-surface` | Simple depth shadow for cards/panels. No heavy shadows. |

### Status Tokens

| Token | Tailwind Class | Purpose | Light | Dark |
|---|---|---|---|---|
| `--npb-status-success` | `text-npb-status-success` | Success states | `#22c55e` | `#4ade80` |
| `--npb-status-warning` | `text-npb-status-warning` | Warning states | `#f59e0b` | `#fbbf24` |
| `--npb-status-error` | `text-npb-status-error` | Error states | `#ef4444` | `#f87171` |
| `--npb-status-info` | `text-npb-status-info` | Info states | `#3b82f6` | `#60a5fa` |

### Motion Tokens

| Token | Value | Purpose |
|---|---|---|
| `--npb-ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Elements entering — responsive feel |
| `--npb-ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | On-screen movement |
| `--npb-duration-fast` | `100ms` | Button press, micro-feedback |
| `--npb-duration-normal` | `200ms` | Dropdowns, tooltips, hover |
| `--npb-duration-slow` | `400ms` | Modals, drawers, entry animations |

---

## Shared Utility Components

Located in `client/src/components/PageBuilder/shared/`. **Use these instead of building custom patterns.**

### `OptionButton`

Toggle button for selecting one of several options (heading levels, alignment, etc.).

```tsx
import { OptionButton } from '../shared';

<OptionButton
  isActive={currentLevel === level}
  onClick={() => updateContent({ level })}
  ariaLabel={`Heading level ${level}`}
>
  H{level}
</OptionButton>
```

**Replaces**: `getOptionButtonClassName()` function duplicated across blocks.

### `OptionGroup`

Wraps a set of `OptionButton`s with a label.

```tsx
import { OptionGroup, OptionButton } from '../shared';

<OptionGroup label="Heading Level">
  {HEADING_LEVELS.map((level) => (
    <OptionButton key={level} isActive={currentLevel === level} onClick={() => updateContent({ level })} ariaLabel={`H${level}`}>
      H{level}
    </OptionButton>
  ))}
</OptionGroup>
```

### `SettingsLabel`

Standard label for settings controls.

```tsx
import { SettingsLabel } from '../shared';

<SettingsLabel htmlFor="spacer-height">Height (px)</SettingsLabel>
<SettingsLabel htmlFor="name" hint="Optional">Name</SettingsLabel>
```

**Replaces**: `<Label className="text-sm font-medium text-gray-700">` pattern.

### `SurfaceCard`

Card surface with optional header. Sharp borders, simple shadow.

```tsx
import { SurfaceCard } from '../shared';

// Simple card
<SurfaceCard>Content here</SurfaceCard>

// Card with header
<SurfaceCard header={{ title: 'Settings', actions: <Button>Save</Button> }}>
  Content here
</SurfaceCard>

// Interactive card (clickable)
<SurfaceCard interactive onClick={handleClick}>
  Clickable content
</SurfaceCard>
```

**Replaces**: `bg-white border border-gray-200 rounded-lg` patterns.

---

## Design Rules

### Borders

- **Surfaces, cards, panels, tables**: Sharp corners (`rounded-[var(--npb-radius-surface)]` = `rounded-none`)
- **Buttons, inputs**: Rounded (`rounded-[var(--npb-radius-input)]` = `rounded-md`)
- **No colored borders on one end of a card** — borders are uniform on all sides

### Shadows

- **Simple depth only**: Use `shadow-[var(--npb-shadow-surface)]`
- **No heavy shadows, no glows, no gradients**

### Focus States

- **One mechanism only**: ring OR border OR outline — never multiple at once
- Use `ring-2 ring-npb-focus ring-offset-1` for focus rings
- Remove default browser outlines when using custom focus

### Card Structure

- **Header**: Full-width, distinct background (`bg-npb-surface-header`), bottom border divider
- **Body**: Sufficient padding, scrollable when needed
- **Sections**: Separated by dividers (`border-npb-divider`), not nested cards
- **Actions**: In header or at bottom, never packed in corners

### Dividers Over Nesting

- Prefer a divider between sections over card-in-card
- Never put a surface within a surface (card within card, panel within panel)
- Use `border-b border-npb-divider` for horizontal section dividers

### Inputs

- Enough height (min `h-9`), padding, and spacing
- Focus: single mechanism (ring OR border OR outline)
- No collision between focus styles

### Typography

- Labels: `text-npb-text-secondary` (via `SettingsLabel`)
- Headings: `text-npb-text-primary`
- Hints/placeholders: `text-npb-text-muted`
- Clear weight differences between hierarchy levels

### Surfaces

- Headers/embedded surfaces must be visually distinct from primary surfaces
- Use `bg-npb-surface-header` for card headers
- Use `bg-npb-surface-raised` for elevated elements
- Use `bg-npb-surface-inset` for inset wells
- Not all UI has to be uniform — sidebar can be dark, canvas light

### No Anti-Patterns

- ❌ No gradients
- ❌ No sparkles
- ❌ No badges (unless explicitly requested)
- ❌ No glows
- ❌ No heavy shadows
- ❌ No hardcoded Tailwind colors (`bg-white`, `text-gray-700`, `border-gray-200`)
- ❌ No card-in-card nesting
- ❌ No colored border on one end only
- ❌ No items packed in corners

---

## Motion & Interaction

### Animation Decision Framework

Before adding any animation, ask: **how often will users see this?**

| Frequency | Examples | Decision |
|---|---|---|
| 100+ times/day | Keyboard shortcuts, command palette, block selection | **No animation. Ever.** |
| Tens of times/day | Hover effects, list navigation, tab switching | Remove or drastically reduce (< 100ms) |
| Occasional | Modals, drawers, toasts, dialogs | Standard animation (150-300ms) |
| Rare/first-time | Onboarding, publish celebration | Can add delight (300-500ms) |

**Never animate keyboard-initiated actions.** These are repeated hundreds of times daily. Animation makes them feel slow.

### Duration Guidelines

| Element | Duration |
|---|---|
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers, dialogs | 200-500ms |
| Page/block entry animations | 300-600ms |

**Rule: UI animations stay under 300ms.** A 180ms dropdown feels more responsive than a 400ms one.

### Easing

**Never use `ease-in` for UI animations.** It starts slow, making the interface feel sluggish.

| Context | Easing | CSS |
|---|---|---|
| Elements entering | ease-out (starts fast, feels responsive) | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Elements exiting | ease-in or ease-out (faster than enter) | `cubic-bezier(0.4, 0, 1, 1)` |
| On-screen movement | ease-in-out | `cubic-bezier(0.77, 0, 0.175, 1)` |
| Hover/color changes | ease | `ease` |
| Constant motion | linear | `linear` |

**Custom easing variables** (define in `index.css`):
```css
:root {
  --npb-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --npb-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

### Button Press Feedback

All pressable elements get `scale(0.97)` on `:active`:

```css
transition: transform 160ms var(--npb-ease-out);
&:active { transform: scale(0.97); }
```

This gives instant feedback. The scale should be subtle (0.95-0.98).

### Entry Animations

- **Never animate from `scale(0)`** — nothing in the real world appears from nothing. Start from `scale(0.95)` + `opacity: 0`.
- **Stagger list items** — 30-80ms delay between items. Never mount everything at once.
- **Asymmetric timing** — press/enter is deliberate (slower), release/exit is snappy (faster).

### Performance Rules

- **Only animate `transform` and `opacity`** — these skip layout and paint, running on GPU.
- **Never animate** `top`, `left`, `width`, `height`, `padding`, `margin` — triggers layout recalc.
- **`will-change: transform`** — use sparingly, only on actively animating elements. Remove after animation completes.
- **`backdrop-blur`** — only on fixed/sticky elements. Never on scrolling containers.

### Accessibility: `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Reduced motion means fewer and gentler animations, not zero. Keep opacity and color transitions that aid comprehension. Remove movement and position animations.

### Touch Device Hover

Gate hover animations behind media query to prevent false positives on touch:

```css
@media (hover: hover) and (pointer: fine) {
  .card:hover { transform: translateY(-2px); }
}
```

---

## Interaction Patterns

### Keystroke UI

Render keyboard shortcuts as physical keys using `<kbd>`:

```tsx
<kbd className="px-1.5 py-0.5 text-xs font-mono border border-npb-border-default rounded-[var(--npb-radius-input)] bg-npb-surface-raised text-npb-text-secondary">
  Ctrl+S
</kbd>
```

### Tooltips

- Delay before first appearance (300-500ms) to prevent accidental activation
- **Skip delay on subsequent hovers** — once one tooltip is open, adjacent tooltips appear instantly
- Use `transform-origin` matching the trigger element position
- Duration: 125-200ms, ease-out

### Z-Index Discipline

Use systemic layers, not arbitrary values:

| Layer | Z-Index | Purpose |
|---|---|---|
| Base content | `z-0` | Default |
| Sticky headers | `z-10` | Sticky nav, topbar |
| Dropdowns/popovers | `z-20` | Select menus, tooltips |
| Modals/dialogs | `z-30` | Overlays, publish dialogs |
| Toasts/notifications | `z-40` | Sonner toasts |
| Drag overlays | `z-50` | DnD ghost elements |

**Never use `z-[9999]` or arbitrary high values.**

### Color Scarcity

Color is a scarce resource. Use it only for:
- **Semantic meaning**: status (success/warning/error/info), accent (links, primary actions)
- **Active states**: selected items, focused inputs
- **Category distinction**: block categories in library (subtle)

**Do not** use color for decoration. The interface should read clearly in grayscale. Muted surfaces and typography weight create hierarchy — not color.

---

## Hardcoded → Token Migration Map

When migrating existing components, use this mapping:

| Old (Hardcoded) | New (Token) |
|---|---|
| `bg-white` | `bg-npb-surface-base` or `<SurfaceCard>` |
| `bg-gray-50` | `bg-npb-surface-raised` |
| `bg-gray-100` | `bg-npb-surface-inset` or `bg-npb-canvas-bg` |
| `bg-gray-200` (active button) | `bg-npb-interactive-bg-active` |
| `text-gray-400` | `text-npb-text-muted` |
| `text-gray-500` | `text-npb-text-muted` |
| `text-gray-600` | `text-npb-text-secondary` |
| `text-gray-700` | `text-npb-text-secondary` or `<SettingsLabel>` |
| `text-gray-800` | `text-npb-text-primary` |
| `text-black` | `text-npb-text-primary` |
| `border-gray-200` | `border-npb-border-default` |
| `border-gray-300` | `border-npb-border-strong` |
| `ring-blue-500` | `ring-npb-focus` |
| `getOptionButtonClassName()` | `<OptionButton>` |
| `text-sm font-medium text-gray-700` | `<SettingsLabel>` |
| `bg-white border border-gray-200 rounded-lg` | `<SurfaceCard>` |

---

## Theme Architecture

- **Global toggle**: `.dark` class on `<html>` element
- **ThemeProvider**: `client/src/components/ThemeProvider.tsx` — manages theme state, persists to `localStorage` key `npb-theme`
- **`useTheme()` hook**: Returns `{ theme, toggleTheme, isDark }`
- **Canvas theme toggle**: Separate toggle in canvas header bar — allows canvas to override global theme
- **One system**: No sidebar-local theme state. Everything follows global theme.

---

## File Locations

| What | Where |
|---|---|
| CSS tokens | `client/src/index.css` (`:root` and `.dark`) |
| Tailwind registration | `tailwind.config.ts` (`theme.extend.colors.npb`) |
| ThemeProvider | `client/src/components/ThemeProvider.tsx` |
| Shared utilities | `client/src/components/PageBuilder/shared/` |
| This document | `docs/design-reference.md` |
