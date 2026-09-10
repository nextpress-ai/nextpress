# Intent — Auto Layout panel + layout honesty

Date: 2026-09-10
Status: Approved via attached plan (keep Group / Container / Columns; improve inspector + renderer).

## What
Unify stacking/alignment/grouping controls into one Auto Layout panel. Fix row Hug/Fill. Default new Group/Container to flex column. Droppable outline not layout. Pin only on flex/grid parents. Vitest UI/UX suite with frozen old trees.

## Why
Layout engine is CSS-complete; inspector is CSS chips. Row children are forced `flex: 1 1 auto`. Saved pages must not migrate.

## How
Shared `AutoLayoutPanel` on Style tab. Shared `getHorizontalFlexChildStyles` for editor + publish + SSR. No new schema. No Storybook.

## Impact
Inspector Style tab, Group Content starters, Group/Container defaults, child wrappers, droppable chrome. Old `display: block` Groups unchanged.
