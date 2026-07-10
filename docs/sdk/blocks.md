# Blocks

**Type:** Reference  
**Source:** `packages/sdk/src/blocks/`

Blocks are stored on pages, posts, and templates. There is no standalone blocks REST API.

## BlockConfig shape

```ts
type BlockConfig = {
  id: string;
  name: string;           // e.g. "core/heading"
  type: "block" | "container";
  parentId: string | null;
  label?: string;
  category?: "basic" | "layout" | "media" | "advanced" | "post";
  content: BlockContent;
  styles?: Record<string, string | number | null | undefined>;
  customCss?: string;
  children?: BlockConfig[];
  settings?: Record<string, unknown>;
  requires?: string;
  isReactive?: boolean;
  other?: Record<string, unknown>;
};
```

### BlockContent kinds

| Kind | Fields | Used by |
|------|--------|---------|
| `text` | `value`, optional `level`, `textAlign`, `dropCap`, `format` | heading, paragraph |
| `markdown` | `value` | markdown block |
| `media` | `url`, `alt`, `caption`, `mediaType` | image, video, audio |
| `html` | `value`, `sanitized` | html block |
| `structured` | `data: Record<string, unknown>` | button, columns, post blocks, etc. |
| `empty` | — | spacer-like blocks |

## Builder API

Access via `nextpress.blocks` or `editor.blocks` inside a session.

| Method | Description |
|--------|-------------|
| `names` | Readonly array of all 35 block names |
| `isBlockName(name)` | Type guard for known block names |
| `fromName(name, params?)` | Create block from registry defaults |
| `custom({ name, type, content, ... })` | Unknown or custom block names |
| Named helpers | Shorthand for each block type (below) |

### Common params (all helpers)

- `id?` — block UUID (auto-generated if omitted)
- `parentId?` — parent container ID
- `label?`, `children?` — tree placement
- `settings.content?` — Content tab (semantics only: text, urls, tagName, structural options)
- `settings.styles?` — Style tab (all inline CSS: flex, padding, colors)
- `settings.advanced?` — Advanced tab (display conditions, `columnLayout`, etc.)
- `css?`, `html?`, `js?` — sanitized escape hatches (custom CSS, HTML override, page scripts)

Shorthand fields like `text` on `heading()` merge into `settings.content`.

---

## Content vs styles

**Content = semantics.** Text, media URLs, icon identity, links, tagName, column layout assignment.

**Styles = all CSS.** Inline properties (`flexDirection`, `padding`, `color`) and top-level `css` (→ `customCss`).

```ts
blocks.group({
  settings: {
    content: { tagName: "div" },
    styles: {
      display: "flex",
      flexDirection: "row",
      gap: "4px",
      padding: "6px 8px",
    },
  },
  css: ".search-bar input { outline: none; }",
  children: [...],
});
```

Nested `children` receive `parentId` automatically on build.

---

## Core blocks (basic)

| Helper | Block name | Notes |
|--------|------------|-------|
| `heading({ settings: { content: { text, level? } } })` | `core/heading` | Default level 2 |
| `paragraph({ settings: { content: { text } } })` | `core/paragraph` | |
| `markdown({ settings: { content: { value } } })` | `core/markdown` | |
| `button(params)` | `core/button` | `settings.content`: text, url, linkTarget |
| `buttons(params)` | `core/buttons` | Container for buttons |
| `quote(params)` | `core/quote` | |
| `list(params)` | `core/list` | |
| `code(params)` | `core/code` | |
| `pullquote(params)` | `core/pullquote` | |
| `preformatted(params)` | `core/preformatted` | |
| `icon(params)` | `core/icon` | |
| `html({ value, sanitized? })` | `core/html` | Default `sanitized: true` |

## Layout blocks

| Helper | Block name |
|--------|------------|
| `columns(params)` | `core/columns` |
| `container(params)` | `core/container` |
| `group(params)` | `core/group` |
| `spacer(params)` | `core/spacer` |
| `separator(params)` | `core/separator` |
| `divider(params)` | `core/divider` |
| `table(params)` | `core/table` |

## Media blocks

| Helper | Block name | Notes |
|--------|------------|-------|
| `image({ url, alt?, caption? })` | `core/image` | URLs validated (http/https) |
| `gallery(params)` | `core/gallery` | |
| `video(params)` | `core/video` | |
| `audio(params)` | `core/audio` | |
| `mediaText(params)` | `core/media-text` | |
| `cover(params)` | `core/cover` | |
| `file(params)` | `core/file` | |

## Post blocks

Used on post templates and post content.

| Helper | Block name |
|--------|------------|
| `postTitle(params)` | `post/title` |
| `postExcerpt(params)` | `post/excerpt` |
| `postFeaturedImage(params)` | `post/featured-image` |
| `postList(params)` | `post/list` |
| `postToc(params)` | `post/toc` |
| `postAuthorBox(params)` | `post/author-box` |
| `postComments(params)` | `post/comments` |
| `postNavigation(params)` | `post/navigation` |
| `postInfo(params)` | `post/info` |
| `postProgress(params)` | `post/progress` |

---

## Full block name list

From `BLOCK_NAMES` in `block-definitions.ts`:

```
core/heading, core/paragraph, core/button, core/buttons, core/image,
core/gallery, core/video, core/audio, core/spacer, core/separator,
core/columns, core/container, core/group, core/quote, core/list,
core/media-text, core/cover, core/file, core/code, core/html,
core/pullquote, core/preformatted, core/table, core/markdown,
core/icon, core/divider,
post/title, post/excerpt, post/featured-image, post/list, post/toc,
post/author-box, post/comments, post/navigation, post/info, post/progress
```

---

## Examples

### Nested container

```ts
const blocks = [
  nextpress.blocks.container({
    settings: {
      content: { tagName: "div" },
      styles: { maxWidth: "1200px", padding: "24px" },
    },
    children: [
      nextpress.blocks.heading({ settings: { content: { text: "Two columns", level: 2 } } }),
      nextpress.blocks.paragraph({ settings: { content: { text: "Body copy." } } }),
    ],
  }),
];
```

### Generic block via fromName

```ts
nextpress.blocks.fromName("core/cover", {
  settings: {
    content: { url: "/uploads/hero.jpg", dimRatio: 50 },
  },
});
```

### Persist blocks

```ts
const page = await nextpress.pages.get({ id: pageId });
const result = await nextpress.pages.update({
  id: pageId,
  expectedVersion: page.version ?? 0,
  blocks,
});
if (result.isErr) throw result.error;
```

See [Versioning](./versioning.md) for optimistic concurrency and `SdkResult`.

---

## Validation

Block inputs are validated when passed to resource methods (`pages.create`, `pages.update`, etc.) via Zod schemas in `packages/sdk/src/schemas/`. Invalid media URLs (e.g. `javascript:`) throw locally before HTTP.

See [Errors and validation](./errors-and-validation.md) and [Versioning](./versioning.md).
