# Phase 7: Complex Fixes & Features

> **Status**: Ready for handoff  
> **Created**: 2026-06-03  
> **Prerequisites**: Global theming migration (Phases 1-6) complete  
> **Build status**: ✅ Passing (Vite build successful)

---

## Task 7a: Auto-save Implementation

**Priority**: P0 (Critical)  
**Estimated effort**: 2-3 hours  
**Complexity**: Medium

### Problem
README claims auto-save exists but it doesn't. Browser crash between manual Ctrl+S saves = lost work. `pageDraftStorage.ts` has localStorage infrastructure but only writes on explicit save.

### Solution
Add debounced auto-save that writes to localStorage on every `commitBlocks` call.

### Files to touch
- `client/src/components/PageBuilder/PageBuilder.tsx` — add debounced localStorage write in `commitBlocks`
- `client/src/lib/pageDraftStorage.ts` — may need to expose auto-save function

### Implementation approach
```typescript
// In PageBuilder.tsx, after commitBlocks updates state:
const debouncedAutoSave = useMemo(
  () => debounce((blocks: BlockConfig[]) => {
    saveDraft(pageId, blocks);
  }, 2000), // 2 second debounce
  [pageId]
);

// Call in commitBlocks:
const commitBlocks = useCallback((updater) => {
  setBlocks(updater);
  debouncedAutoSave(updater(blocks));
}, [...]);
```

### Verification
1. Edit a block, wait 3 seconds, refresh page → draft should restore
2. Edit rapidly (typing) → should not save on every keystroke (debounce works)
3. Ctrl+S still works (manual save not broken)
4. Check localStorage → draft key should update after debounce

### Acceptance criteria
- [ ] Auto-save triggers 2 seconds after last edit
- [ ] No performance impact (debounced, not on every change)
- [ ] Manual Ctrl+S still works
- [ ] Draft restores on page reload
- [ ] README claim now true

---

## Task 7b: Block Deselection Bug Fix

**Priority**: P0 (Critical)  
**Estimated effort**: 1-2 hours  
**Complexity**: Medium-High

### Problem
Clicking any settings control deselects the block. Documented in `docs/post-blocks-report.md`. Race condition between `useUndoRedo.currentState` and separate `useState` for blocks in `PageBuilder.tsx`.

### Root cause
```typescript
// PageBuilder.tsx lines ~93-95
useEffect(() => {
  setBlocks(currentState);
}, [currentState]);
```
This syncs undo/redo state to blocks state, but triggers on every undo/redo push, causing deselection.

### Solution
Only sync when `currentState` changes from external source (undo/redo buttons), not from internal edits.

### Files to touch
- `client/src/components/PageBuilder/PageBuilder.tsx` — fix the sync effect

### Implementation approach
```typescript
// Track if change came from undo/redo vs internal edit
const isUndoRedoAction = useRef(false);

// In undo/redo handlers:
const handleUndo = () => {
  isUndoRedoAction.current = true;
  undo();
};

// In sync effect:
useEffect(() => {
  if (isUndoRedoAction.current) {
    setBlocks(currentState);
    isUndoRedoAction.current = false;
  }
}, [currentState]);
```

Alternative: Remove the sync effect entirely and derive `blocks` directly from `currentState`.

### Verification
1. Select a block → click settings control → block should stay selected
2. Undo/redo still works
3. Edit block content → changes persist
4. No infinite loops or excessive re-renders

### Acceptance criteria
- [ ] Block stays selected when interacting with settings
- [ ] Undo/redo still functional
- [ ] No performance regression
- [ ] No console errors

---

## Task 7c: Columns/Group/Container 3-File Split

**Priority**: P1 (High)  
**Estimated effort**: 4-6 hours  
**Complexity**: High

### Problem
Three blocks exceed 400 LOC limit:
- `columns/ColumnsBlock.tsx` — 754 LOC
- `group/GroupBlock.tsx` — 710 LOC  
- `container/ContainerBlock.tsx` — 577 LOC

### Solution
Split each into 3 files following icon block pattern:
- `Block.tsx` — component + renderer + definition
- `block-settings.tsx` — settings UI
- `block-model.ts` — data model, types, defaults

### Files to touch
- `client/src/components/PageBuilder/blocks/columns/` — split ColumnsBlock.tsx
- `client/src/components/PageBuilder/blocks/group/` — split GroupBlock.tsx
- `client/src/components/PageBuilder/blocks/container/` — split ContainerBlock.tsx

### Implementation approach (per block)

**Step 1: Extract model**
```typescript
// columns-model.ts
export type ColumnsContent = { ... };
export const DEFAULT_COLUMNS_CONTENT: ColumnsContent = { ... };
export function parseColumnsContent(raw: unknown): ColumnsContent { ... }
export function serializeColumnsContent(content: ColumnsContent): unknown { ... }
```

**Step 2: Extract settings**
```typescript
// columns-settings.tsx
export function ColumnsSettings({ block, onUpdate }: ColumnsSettingsProps) {
  // Move all settings UI here
}
```

**Step 3: Simplify main file**
```typescript
// ColumnsBlock.tsx
import { ColumnsSettings } from './columns-settings';
import { DEFAULT_COLUMNS_CONTENT } from './columns-model';

export function ColumnsBlockComponent({ value, onChange }: BlockComponentProps) {
  // Component + renderer only
}

export const ColumnsBlock: BlockDefinition = {
  // ... definition
  component: ColumnsBlockComponent,
  settings: ColumnsSettings,
};
```

### Verification
1. Each main file < 400 LOC
2. Block renders correctly in canvas
3. Settings panel works
4. No functionality lost
5. Build passes

### Acceptance criteria
- [ ] All 3 blocks split into 3 files each
- [ ] Main files < 400 LOC
- [ ] No functionality regression
- [ ] Build passes
- [ ] Follows icon block pattern exactly

---

## Task 7d: TokenSpacingPicker Decision

**Priority**: P1 (High)  
**Estimated effort**: 3-4 hours (if wiring) or 30min (if deleting)  
**Complexity**: Medium

### Problem
`TokenSpacingPicker.tsx` exists, is functional, but has zero consumers. `BlockSettings.tsx` uses `FreeformSpacingSideRow` instead. Dead code.

### Decision needed
**Option A**: Wire it into BlockSettings (better UX, token-based spacing)  
**Option B**: Delete it (remove dead code)

### If Option A (wire it)

**Files to touch**:
- `client/src/components/PageBuilder/BlockSettings.tsx` — replace FreeformSpacingSideRow with TokenSpacingPicker
- `client/src/components/PageBuilder/TokenSpacingPicker.tsx` — may need API adjustments

**Implementation**:
```typescript
// In BlockSettings.tsx spacing section:
<TokenSpacingPicker
  label="Padding"
  value={spacing.padding}
  onChange={(newPadding) => updateSpacing('padding', newPadding)}
/>
```

### If Option B (delete)

**Files to touch**:
- Move `client/src/components/PageBuilder/TokenSpacingPicker.tsx` to `/trash/`

### Verification
- Option A: Spacing controls work, use tokens
- Option B: No broken imports, build passes

### Acceptance criteria
- [ ] Decision made (wire or delete)
- [ ] Implementation complete
- [ ] No dead code or broken imports
- [ ] Build passes

---

## Task 7e: Block Library Search

**Priority**: P1 (High)  
**Estimated effort**: 2-3 hours  
**Complexity**: Low-Medium

### Problem
35+ blocks in library with no search/filter. Users must scroll through categories.

### Solution
Add search input at top of BlockLibrary that filters blocks by label/description/category.

### Files to touch
- `client/src/components/PageBuilder/BlockLibrary.tsx` — add search input + filter logic

### Implementation approach
```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredBlocks = useMemo(() => {
  if (!searchQuery) return allBlocks;
  const query = searchQuery.toLowerCase();
  return allBlocks.filter(block =>
    block.label.toLowerCase().includes(query) ||
    block.description.toLowerCase().includes(query) ||
    block.category.toLowerCase().includes(query)
  );
}, [allBlocks, searchQuery]);

// Render search input at top:
<Input
  placeholder="Search blocks..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="mb-4"
/>
```

### Verification
1. Type "head" → shows Heading block
2. Type "media" → shows Media Text, Image, Video, etc.
3. Clear search → all blocks visible
4. Search is case-insensitive
5. No performance lag (useMemo prevents re-filtering on every render)

### Acceptance criteria
- [ ] Search input at top of library
- [ ] Filters by label, description, category
- [ ] Case-insensitive
- [ ] Performant (no lag)
- [ ] Clear button or empty state when no results

---

## Task 7f: Keyboard Shortcuts

**Priority**: P1 (High)  
**Estimated effort**: 2-3 hours  
**Complexity**: Low

### Problem
Missing basic keyboard shortcuts:
- Delete/Backspace — delete selected block
- Escape — deselect block
- Ctrl+D — duplicate selected block

### Solution
Add keyboard event listeners in PageBuilder.

### Files to touch
- `client/src/components/PageBuilder/PageBuilder.tsx` — add keyboard handlers

### Implementation approach
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!selectedBlockId) return;
    
    // Delete/Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDelete(selectedBlockId);
    }
    
    // Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      setSelectedBlockId(null);
    }
    
    // Ctrl+D (duplicate)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      handleDuplicate(selectedBlockId);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [selectedBlockId, handleDelete, handleDuplicate]);
```

### Verification
1. Select block → press Delete → block deleted
2. Select block → press Escape → block deselected
3. Select block → press Ctrl+D → block duplicated
4. Shortcuts don't interfere with text input (check `e.target.tagName`)
5. No conflicts with existing shortcuts (Ctrl+Z, Ctrl+S)

### Acceptance criteria
- [ ] Delete/Backspace deletes selected block
- [ ] Escape deselects block
- [ ] Ctrl+D duplicates block
- [ ] No conflicts with text input
- [ ] No conflicts with existing shortcuts

---

## Task 7g: Visual Drop Placeholders + Auto-scroll

**Priority**: P2 (Medium)  
**Estimated effort**: 3-4 hours  
**Complexity**: High

### Problem
During drag-and-drop:
- No visual indicator showing where block will land
- No auto-scroll when dragging to canvas edges

### Solution
1. Add drop placeholder element that shows insertion point
2. Add auto-scroll when dragging near viewport edges

### Files to touch
- `client/src/lib/dnd/index.tsx` — custom DnD library (486 LOC)
- `client/src/components/PageBuilder/BuilderCanvas.tsx` — may need drop zone styling

### Implementation approach

**Drop placeholder**:
```typescript
// In DnD handler, when calculating drop position:
const [dropPlaceholder, setDropPlaceholder] = useState<{
  parentId: string;
  index: number;
} | null>(null);

// Render placeholder in canvas:
{dropPlaceholder && (
  <div className="h-12 border-2 border-dashed border-npb-accent bg-npb-accent/10 rounded" />
)}
```

**Auto-scroll**:
```typescript
// In drag move handler:
const handleDragMove = (e: MouseEvent) => {
  const viewportHeight = window.innerHeight;
  const scrollThreshold = 100; // pixels from edge
  
  if (e.clientY < scrollThreshold) {
    window.scrollBy(0, -10); // scroll up
  } else if (e.clientY > viewportHeight - scrollThreshold) {
    window.scrollBy(0, 10); // scroll down
  }
};
```

### Verification
1. Drag block → see placeholder at insertion point
2. Drag to top edge → canvas scrolls up
3. Drag to bottom edge → canvas scrolls down
4. Drop works correctly
5. No performance lag during drag

### Acceptance criteria
- [ ] Visual drop placeholder visible during drag
- [ ] Auto-scroll works at viewport edges
- [ ] Smooth scrolling (no jank)
- [ ] Drop accuracy not affected
- [ ] Works on touch devices

---

## Task 7h: PublicBlockRenderer Fixes

**Priority**: P2 (Medium)  
**Estimated effort**: 2-3 hours  
**Complexity**: Medium

### Problem
`PublicBlockRenderer.tsx` has issues:
- Buttons hardcoded to `#007cba` color
- Markdown outputs raw text (not parsed to HTML)

### Solution
1. Replace hardcoded button colors with tokens
2. Add markdown parsing (use existing markdown library)

### Files to touch
- `client/src/components/PageBuilder/PublicBlockRenderer.tsx` — fix button colors + markdown

### Implementation approach

**Button colors**:
```typescript
// Find hardcoded #007cba and replace with:
className="bg-npb-accent hover:bg-npb-accent-hover text-white"
```

**Markdown parsing**:
```typescript
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// In markdown renderer:
const html = marked.parse(content.value);
const sanitized = DOMPurify.sanitize(html);
return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
```

### Verification
1. Buttons use theme colors (change with light/dark mode)
2. Markdown renders as HTML (headings, lists, links, etc.)
3. No XSS vulnerabilities (DOMPurify sanitizes)
4. Public preview matches editor preview

### Acceptance criteria
- [ ] No hardcoded colors in PublicBlockRenderer
- [ ] Markdown renders as HTML
- [ ] XSS-safe (sanitized)
- [ ] Public preview matches editor
- [ ] Build passes

---

## Handoff Notes

### Build status
✅ **Vite build passes** (tested 2026-06-03)  
⚠️ **TypeScript has pre-existing errors** (not caused by theming work):
- `shared/block-container-placement.ts:334` — FlexWrap type
- `client/src/pages/Users.tsx` — form value types
- `client/src/test/*.test.ts` — test type issues

These are pre-existing and not blockers for Phase 7 work.

### Backup
Pre-theming backup at `/backup/client-src-pre-theming` if rollback needed.

### Design reference
All UI work must follow `/docs/design-reference.md` — tokens, shared utilities, design rules.

### Shared utilities available
- `OptionButton` — toggle buttons
- `OptionGroup` — button groups with label
- `SettingsLabel` — form labels
- `SurfaceCard` — card surfaces

Import from `client/src/components/PageBuilder/shared`.

### Testing approach
For each task:
1. Implement the fix/feature
2. Run `pnpm vite build` to verify build passes
3. Manual testing per verification steps
4. Update task.md with completion status

### Questions?
Refer to:
- `/docs/blocks-report.md` — block audit findings
- `/docs/design-reference.md` — theming system
- `/docs/post-blocks-report.md` — block deselection bug analysis
- `/context.md` — project architecture

---

## Task Priority Summary

| Task | Priority | Effort | Complexity | Recommendation |
|------|----------|--------|------------|----------------|
| 7a: Auto-save | P0 | 2-3h | Medium | **Start here** — critical feature |
| 7b: Block deselection | P0 | 1-2h | Medium-High | **Do second** — critical bug |
| 7c: 3-file split | P1 | 4-6h | High | Do when you have time block |
| 7d: TokenSpacingPicker | P1 | 30min-4h | Medium | Quick decision needed |
| 7e: Library search | P1 | 2-3h | Low-Medium | Good intermediate task |
| 7f: Keyboard shortcuts | P1 | 2-3h | Low | Good intermediate task |
| 7g: Drop placeholders | P2 | 3-4h | High | Advanced task |
| 7h: PublicBlockRenderer | P2 | 2-3h | Medium | Good intermediate task |

**Suggested order**: 7a → 7b → 7d (quick win) → 7e → 7f → 7h → 7c → 7g
