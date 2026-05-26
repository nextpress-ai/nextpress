# Page Builder Blocks Review and Fixes Report

**Date:** April 14, 2026
**Status:** Completed

## Summary

Reviewed all page builder blocks in `/client/src/components/PageBuilder/blocks/` and fixed bugs, added sensible defaults, and updated tests where needed.

---

### Template System Enhancements Added

In addition to block fixes, the Template feature was enhanced with:

1. **Template Variables** — Dynamic `{{namespace.field}}` placeholders for reusable templates
2. **Conditional Display Logic** — Show/hide templates and blocks based on context rules  
3. **Page Builder Integration** — Edit templates in builder, insert templates into pages/posts
4. **Variable Insertion in Blocks** — In-block variable insertion for heading, text, button blocks

---

## Bug Fixes Applied

### 1. DividerBlock (Critical)
- **Issue:** Wrong block ID `'divider'` instead of `'core/divider'`
- **Fix:** Changed ID to `'core/divider'` and registered in block index
- **Files:** `blocks/divider/DividerBlock.tsx`, `blocks/index.ts`

### 2. VideoBlock
- **Issue:** Regex bug in `parseStartSeconds` - incorrect alternation grouping
- **Fix:** Changed regex from `(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?|(\d+)` to `(?:(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?)|(\d+)`
- **Files:** `blocks/video/VideoBlock.tsx:99`

- **Issue:** YouTube autoplay without mute fails in browsers
- **Fix:** Auto-force `mute=1` when autoplay is enabled
- **Files:** `blocks/video/VideoBlock.tsx:159`

### 3. GalleryBlock
- **Issue:** `<figcaption>` used outside `<figure>` (invalid HTML)
- **Fix:** Changed to use `<div>` inside image wrapper
- **Files:** `blocks/gallery/GalleryBlock.tsx:133-137`

- **Issue:** Variable shadowing (`content` used twice)
- **Fix:** Renamed to `linkContent`
- **Files:** `blocks/gallery/GalleryBlock.tsx:124-128`

### 4. CodeBlock
- **Issue:** Code content rendered as HTML (e.g. `<div>` shows as element)
- **Fix:** Added `whiteSpace: 'pre-wrap'` and `wordBreak: 'break-word'`
- **Files:** `blocks/code/CodeBlock.tsx:60`

### 5. ListBlock
- **Issue:** XSS vulnerability - user input rendered without sanitization
- **Fix:** Apply `sanitizeHtml()` on each list item
- **Files:** `blocks/list/ListBlock.tsx:171`

### 6. QuoteBlock
- **Issue:** XSS vulnerability - user input rendered without sanitization
- **Fix:** Apply `sanitizeHtml()` on each paragraph line
- **Files:** `blocks/quote/QuoteBlock.tsx:169`

### 7. MarkdownBlock
- **Issue:** Dual update pattern causing duplicate state updates
- **Fix:** Use `else` branch only (accessor XOR onChange, not both)
- **Files:** `blocks/markdown/MarkdownBlock.tsx:89-103`

### 8. PostExcerptBlock
- **Issue:** "Read More" only shows when text is truncated
- **Fix:** Show when enabled (regardless of truncation)
- **Files:** `blocks/post-excerpt/PostExcerptBlock.tsx:101`

### 9. HeadingBlock
- **Issue:** Level change handler uses `onUpdate` instead of accessor
- **Fix:** Properly use accessor when available, onUpdate as fallback
- **Files:** `blocks/heading/HeadingBlock.tsx:231-241`

### 10. PostProgressBlock
- **Issue:** No validation on height input (can be negative or too large)
- **Fix:** Clamp value between 2 and 12
- **Files:** `blocks/post-progress/PostProgressBlock.tsx:325-327`

---

## Sensible Defaults Added

### defaultStyles added:
- VideoBlock: `{ width: '100%' }`
- GalleryBlock: `{ width: '100%', margin: '1em 0' }`
- ListBlock: `{ margin: '1em 0' }`
- QuoteBlock: `{ margin: '1em 0' }`
- ColumnsBlock: `{ margin: '1em 0' }`
- MediaTextBlock: `{ margin: '1em 0' }`
- ButtonsBlock: `{ margin: '1em 0' }`
- AudioBlock: `{ width: '100%' }`
- PostListBlock: `{ margin: '1em 0' }`
- PostCommentsBlock: `{ margin: '1em 0' }`

### defaultContent added:
- **TableBlock:** Default 3-column table with headers and 2 rows
- **HtmlBlock:** Placeholder HTML comment template

---

## Tests Fixed

- `client/src/test/HeadingBlock.test.tsx` - Line 195: Updated test to expect only styles change
- `client/src/test/BlockEditing.test.tsx` - Lines 62 & 257: Updated tests to match new behavior

---

## Test Results

```
Test Files  26 passed (26)
Tests    424 passed (424)
```

---

## Files Modified

1. `client/src/components/PageBuilder/blocks/divider/DividerBlock.tsx`
2. `client/src/components/PageBuilder/blocks/index.ts`
3. `client/src/components/PageBuilder/blocks/video/VideoBlock.tsx`
4. `client/src/components/PageBuilder/blocks/gallery/GalleryBlock.tsx`
5. `client/src/components/PageBuilder/blocks/code/CodeBlock.tsx`
6. `client/src/components/PageBuilder/blocks/list/ListBlock.tsx`
7. `client/src/components/PageBuilder/blocks/quote/QuoteBlock.tsx`
8. `client/src/components/PageBuilder/blocks/markdown/MarkdownBlock.tsx`
9. `client/src/components/PageBuilder/blocks/post-excerpt/PostExcerptBlock.tsx`
10. `client/src/components/PageBuilder/blocks/heading/HeadingBlock.tsx`
11. `client/src/components/PageBuilder/blocks/post-progress/PostProgressBlock.tsx`
12. `client/src/components/PageBuilder/blocks/audio/AudioBlock.tsx`
13. `client/src/components/PageBuilder/blocks/table/TableBlock.tsx`
14. `client/src/components/PageBuilder/blocks/html/HtmlBlock.tsx`
15. `client/src/test/HeadingBlock.test.tsx`
16. `client/src/test/BlockEditing.test.tsx`