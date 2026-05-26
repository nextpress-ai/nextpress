# Post Blocks Testing Report

## Test Method
- Agent-browser headless testing on `http://localhost:5000`
- Deep code analysis of block state management architecture

## Blocks Tested via Browser
| Block | In Canvas | Settings Panel | Settings Persist |
|-------|-----------|---------------|-----------------|
| Post Title | ✅ | ✅ Heading level, CSS class | ❌ Deselects on interaction |
| Post Author Box | ✅ | ✅ Author ID, Layout, Avatar Size, toggles, Post section | ❌ Deselects on interaction |
| Post Excerpt | ✅ | ✅ Max length, Read More, CSS class | ❌ Deselects on interaction |

## Blocks Not Tested (need DnD to add to canvas)
- Post Info, Post Comments, Post Navigation, Featured Image, Table of Contents, Post List, Reading Progress
- DnD from sidebar to canvas could not be tested in headless browser

## Root Cause: Block Deselection on Settings Interaction

**Symptom**: Clicking ANY settings control (switch, dropdown, input) causes the block to immediately deselect. The settings panel reverts to Page settings with Block button disabled.

**Root cause**: In `PageBuilder.tsx`, the external reset effect deselects blocks when `propBlocks` changes:

```tsx
useEffect(() => {
  if (!propBlocks) return;
  if (propBlocks === lastEmittedRef.current) return;  // reference guard
  resetState(propBlocks);
  setSelectedBlockId(null);  // <-- THIS deselects the block
}, [propBlocks, resetState]);
```

The guard `propBlocks === lastEmittedRef.current` is supposed to prevent this when the change originated internally. However, the flow is:

1. Settings → `accessor.setContent()` → block component state change
2. `useBlockState` effect → `onChange(nextBlock)` → `handleBlockChange` → `commitBlocks`
3. `commitBlocks` → `setBlocks(newArray)` + `pushState(newArray)`
4. Emit effect → `lastEmittedRef.current = blocks` + `onBlocksChange(blocks)`
5. `PageBuilderEditor.handleBlocksChange` → `setBlocks(nextBlocks)` (same ref)
6. Parent re-renders → passes `blocks` back as `propBlocks`

The reference guard should work (`propBlocks === lastEmittedRef.current`), BUT there's a race condition:
- `pushState` inside `commitBlocks` triggers undo history state updates
- The `useEffect(() => setBlocks(currentState), [currentState])` fires AFTER the emit
- This causes a SECOND `blocks` state update with the `currentState` from undo history
- The second emit overwrites `lastEmittedRef.current` with a different reference
- When `propBlocks` arrives from parent, it matches the FIRST emit ref, not the SECOND

## Additional Issues Found

1. **`pushState` not memoized** in `useUndoRedo.ts` — causes `commitBlocks` and `handleBlockChange` to be recreated every render (minor perf issue but contributes to reference instability)

2. **Dual state management** — `PageBuilder` maintains BOTH `useUndoRedo.currentState` AND a separate `useState` for `blocks`, synced via useEffect. This creates a window where they're out of sync and causes double emissions.

## Proposed Fix

The simplest fix: **Don't deselect the block on propBlocks change**. The deselection was added for the inline-post-editing case (switching between editing different posts), but it fires on EVERY internal change that round-trips through the parent.

**Fix approach**: Only deselect when the block IDs in the new propBlocks are fundamentally different (e.g. different post), not when just content changed.
