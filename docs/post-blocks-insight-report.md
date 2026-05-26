# Post Blocks vs Basic Blocks: Comprehensive Insight Report

## Executive Summary

After deep analysis of both block families, the architectural patterns are **nearly identical** — post blocks follow the same component/settings/renderer triple that basic blocks use. The issues the user experiences (drag not working, no content editing) are **not caused by fundamental pattern differences** but by specific gaps and mismatches documented below.

---

## 1. Architecture Comparison

### Block Definition Structure

Both families export the same `BlockDefinition` shape:

| Field | Basic (e.g. HeadingBlock) | Post (e.g. PostAuthorBoxBlock) |
|-------|---------------------------|-------------------------------|
| `id` | `'core/heading'` | `'post/author-box'` |
| `category` | `'basic'` | `'post'` |
| `component` | ✅ `HeadingBlockComponent` | ✅ `PostAuthorBoxComponent` |
| `renderer` | ✅ `LegacyHeadingRenderer` | ✅ `LegacyPostAuthorBoxRenderer` |
| `settings` | ✅ `LegacyHeadingSettings` | ✅ `PostAuthorBoxSettings` |
| `hasSettings` | ✅ `true` | ✅ `true` |
| `defaultContent` | ✅ with `kind: 'text'` | ✅ plain object (no `kind`) |
| `defaultStyles` | ✅ fontSize, fontWeight, etc. | ✅ margin only |

**Verdict: Structurally identical.** Both have component, renderer, settings, and are registered in `blockRegistry`.

---

## 2. Content Type Mismatch (KEY DIFFERENCE)

### Basic blocks: Extend `BlockContent`
```ts
type HeadingContent = BlockContent & {
  level?: number;
  anchor?: string;
  className?: string;
};
// Has `kind: 'text'` and `value: string` from BlockContent
```

### Post blocks: Custom types WITHOUT BlockContent
```ts
type PostAuthorBoxContent = {
  authorId?: string;
  postId?: string;
  showAvatar?: boolean;
  layout?: 'horizontal' | 'vertical';
  // NO `kind`, NO `value`
};
```

### Impact
- `BlockConfig.content` is typed as `BlockContent` (discriminated union with `kind`)
- Post blocks store content that **doesn't match the `BlockContent` type** — no `kind` discriminator
- This forces `as unknown as BlockContent` casts everywhere in post block code
- Any code that checks `content.kind` (e.g., `kind === 'text'`) will fail silently for post blocks
- The `getDefaultBlock()` function stores post block content into `BlockConfig.content` without type validation

### Recommendation
Post blocks should wrap their content in `{ kind: 'structured', data: { ...postContent } }` to conform to `BlockContent`, OR the `BlockContent` type needs a new variant for post blocks.

---

## 3. Settings Panel Pattern (MINOR DIFFERENCE)

### Basic blocks: Direct accessor read
```ts
function LegacyHeadingSettings({ block, onUpdate }) {
  const accessor = getBlockStateAccessor(block.id);
  const [, setUpdateTrigger] = useState(0); // force re-render

  const content = accessor
    ? accessor.getContent() as HeadingContent   // reads LIVE from accessor
    : block.content || DEFAULT_CONTENT;

  const updateContent = (updates) => {
    if (accessor) {
      accessor.setContent({ ...current, ...updates });
      setUpdateTrigger(prev => prev + 1);  // force component to re-read accessor
    } else if (onUpdate) {
      onUpdate({ content: { ...block.content, ...updates } });
    }
  };
}
```

### Post blocks: Local state mirror
```ts
function PostAuthorBoxSettings({ block, onUpdate }) {
  const accessor = getBlockStateAccessor(block.id);
  const [localContent, setLocalContent] = useState(block.content || DEFAULT);

  useEffect(() => {
    setLocalContent(block.content || DEFAULT);
  }, [block.content]);

  const updateContent = (updates) => {
    const updated = { ...localContent, ...updates };
    setLocalContent(updated);          // update local first
    if (accessor) {
      accessor.setContent(updated);    // then push to block component
    } else if (onUpdate) {
      onUpdate({ content: updated });
    }
  };
}
```

### Impact
- Basic pattern: Reads directly from accessor on every render, uses `setUpdateTrigger` to force re-render after accessor update. Simpler but relies on accessor always being available.
- Post pattern: Maintains a local copy, syncs via `useEffect`. More defensive but adds the `useEffect` sync complexity.
- **Both approaches work** — neither causes the drag or editing issues.

---

## 4. Drag & Drop Analysis (NO CODE DIFFERENCE)

### Sidebar (BlockLibrary.tsx)
Both basic and post blocks use the **exact same code**:
```tsx
<Draggable key={block.id} draggableId={block.id} index={startIndex + index}>
  {(provided, snapshot) => (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}     // ← onMouseDown/onTouchStart here
      className={`cursor-grab ...`}
    >
      {/* icon + label */}
    </Card>
  )}
</Draggable>
```
- `draggableId` = definition id (e.g., `'post/title'` or `'core/heading'`)
- The entire Card is both draggable AND drag handle
- `dragHandleProps` includes `onMouseDown` which initiates the custom DnD

### Canvas (BuilderCanvas.tsx)
Both families use:
```tsx
<Draggable key={block.id} draggableId={block.id} index={index}>
  {(provided, snapshot) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}      // just data attr, NO mouse handlers
    >
      <BlockRenderer
        dragHandleProps={provided.dragHandleProps}  // grip icon gets drag handler
      />
    </div>
  )}
</Draggable>
```
- The wrapper div does NOT have drag handlers (intentional — allows clicks for selection)
- Only the grip icon button in the toolbar gets `dragHandleProps`

### Drop Handler (useDragAndDropHandler.ts)
```tsx
const isFromLibrary = source.droppableId.startsWith('block-library');
if (isFromLibrary) {
  const inserted = insertNewBlock(blocks, destParentId, destIndexGlobal, draggableId);
  // draggableId = 'post/title' → looked up in blockRegistry → creates block
}
```
- `insertNewBlock` calls `getDefaultBlock(type, id)` which looks up `blockRegistry[type]`
- Post blocks ARE in `blockRegistry` → block creation should succeed

### Why drag might appear to fail
1. **No visual difference when dragging**: The drag overlay shows block name, but the block library scroll area may not visually indicate the drag started. The custom DnD uses `e.preventDefault()` which suppresses default browser drag behavior — the only visual feedback is the overlay tooltip following the cursor.
2. **Drop target detection**: The custom DnD uses `document.elementFromPoint()` to find the canvas droppable. If the sidebar and canvas overlap or if there's a CSS stacking context issue, the drop target might not be found.
3. **Post category visibility**: The "Post" category is the LAST category in the sidebar. If the sidebar scroll area is short, users may not see it or may struggle to scroll while dragging.
4. **Runtime errors**: If any post block's `component` throws during render (e.g., type error from content mismatch), the block would be added to state but fail to render, appearing as if drag failed.

### Recommended debugging
- Open browser DevTools console, drag a post block, check for errors
- The DnD library has debug logging behind `DEBUG_BUILDER` env flag

---

## 5. Editor vs Preview Mode (MOSTLY IDENTICAL)

### Basic blocks: No editor/preview distinction in component
```tsx
// HeadingBlockComponent — no isPreview param used
function HeadingBlockComponent({ value, onChange }: BlockComponentProps) {
  const { content, styles } = useBlockState<HeadingContent>({ value, getDefaultContent, onChange });
  return <HeadingRenderer content={content} styles={styles} />;
}
// HeadingRenderer — always static, no contentEditable
```

### Post blocks: Mixed approaches
| Block | Editor Mode | Preview Mode | Inline Editing? |
|-------|-------------|-------------|-----------------|
| PostTitle | contentEditable heading | Static heading | ✅ Yes |
| PostExcerpt | Textarea | Truncated text + Read More | ✅ Yes |
| PostAuthorBox | Placeholder author data | Fetches real author from API | ❌ No |
| PostComments | Placeholder comments | Fetches real comments from API | ❌ No |
| PostInfo | Placeholder meta | Fetches real post meta | ❌ No |
| PostNavigation | Placeholder prev/next | Fetches real adjacent posts | ❌ No |
| PostToc | Placeholder headings | Scans real headings | ❌ No |
| PostFeaturedImage | Placeholder image | Fetches real image | ❌ No |
| PostList | Placeholder posts | Fetches real post list | ❌ No |
| PostProgress | Static progress bar | Live scroll tracking | ❌ No |

### Verdict
- **Basic blocks have ZERO inline editing** — all editing is through the settings panel
- **PostTitle and PostExcerpt have MORE editing** than basic blocks (contentEditable / textarea)
- **Other post blocks** are identical to basic blocks: static render, edit via settings panel
- The "no content editing provisions" observation applies equally to basic blocks — they also only edit through the sidebar settings

---

## 6. Key Gaps & Issues Found

### Issue A: Block Deselection on Settings Interaction (FIXED)
**Root cause**: `PageBuilder.tsx` had an unconditional `setSelectedBlockId(null)` when `propBlocks` changed, causing round-trip deselection.
**Status**: Fixed — now only deselects when selected block no longer exists in new blocks.

### Issue B: Content Type Mismatch (UNFIXED)
Post blocks use plain objects as content instead of conforming to the `BlockContent` discriminated union. This causes:
- TypeScript `as unknown as BlockContent` casts scattered through code
- Potential runtime issues when any code checks `content.kind`
- No type safety for post block content

### Issue C: PostNewBlock Still Imported (MINOR)
`PostNewBlock` is imported in `blocks/index.ts` but not registered in `blockRegistry`. Dead code.

### Issue D: No "Editor Chrome" for Post Blocks (DESIGN GAP)
Most post blocks (Author Box, Comments, Info, Navigation, etc.) render identically in editor and preview mode. In the editor, they show placeholder data instead of real data, but there's no visual indication that they're configurable — no edit icon, no "click to configure" overlay, no inline controls.

Basic blocks have the same limitation, but it's less noticeable because their content is simpler (text you can see in the settings panel).

### Issue E: Dual onChange Path in PostTitle/PostExcerpt
These blocks call BOTH `accessor.setContent(updated)` AND `onChange(...)` in their text change handlers. This double-update can cause race conditions:
```tsx
const handleTextChange = (newText: string) => {
  const accessor = getBlockStateAccessor(value.id);
  if (accessor) {
    accessor.setContent(updated);   // Path 1: via accessor → useBlockState → onChange
  }
  onChange({ ...value, content: { text: newText } }); // Path 2: direct onChange
  // BOTH paths trigger handleBlockChange → commitBlocks
};
```

---

## 7. Recommendations

1. **Debug drag issue**: Set `DEBUG_BUILDER=true` in env and check console while dragging post blocks. If no errors, the issue is likely CSS/scroll-related in the sidebar.

2. **Unify content types**: Either wrap post block content in `{ kind: 'structured', data: {...} }` or add a `{ kind: 'post'; data: Record<string, unknown> }` variant to `BlockContent`.

3. **Fix dual onChange**: In PostTitle/PostExcerpt, remove the direct `onChange(...)` call — the accessor path already triggers onChange through `useBlockState`.

4. **Add editor chrome**: Consider adding a subtle "Configure in sidebar →" overlay or dashed border for post blocks in editor mode, to signal that they have settings.

5. **Clean up PostNewBlock import**: Remove unused import from `blocks/index.ts`.
