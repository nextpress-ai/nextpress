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
  category?: "basic" | "form" | "layout" | "media" | "advanced" | "post";
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
| `names` | Readonly array of all 39 block names |
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

## Form blocks

| Helper | Block name | Notes |
|--------|------------|-------|
| `input(params)` | `core/input` | Text, email, password, etc. |
| `textarea(params)` | `core/textarea` | Multi-line field |
| `select(params)` | `core/select` | Dropdown options list |
| `form(params)` | `core/form` | Holds the fields. Answers show up under Forms in the admin |
| `submitButton({ text? })` | `core/button` | The button that sends a form. Text defaults to "Send" |

Form blocks ship with publish-safe default styles (hex colors, not admin CSS variables).

### Forms

`form()` on its own gives the same form the editor adds: a name field, an email field, a message box and a Send button. Give it `children` to use your own fields instead (you then also add the Send button yourself).

```ts
const form = nextpress.blocks.form({
  settings: { content: { name: "Waitlist", successMessage: "You are on the list." } },
  children: [
    nextpress.blocks.input({
      settings: { content: { name: "email", label: "Your email", type: "email", required: true } },
    }),
    nextpress.blocks.submitButton({ text: "Join" }),
  ],
});
```

Every field needs a `name` (what the answer is stored under) and a `label` (what people see above the field). Fields with the same name count once.

## Layout blocks

| Helper | Block name | Notes |
|--------|------------|-------|
| `columns(params)` | `core/columns` | Use `columnCount` or `columnGroups`; sets `settings.columnLayout` |
| `container(params)` | `core/container` |
| `group(params)` | `core/group` |
| `spacer(params)` | `core/spacer` |
| `separator(params)` | `core/separator` |
| `divider(params)` | `core/divider` |
| `table(params)` | `core/table` |
| `fromName("core/accordion", …)` | `core/accordion` | Children are `core/accordion-item` blocks. Content: `openMode` (`one`/`many`), `firstOpen`, `look` (`cards`/`lines`/`plain`), `icon` (`preset`: `plus-minus`/`chevron`/`arrow`/`custom`, `closed`/`open` icon refs, `position`, `size`), `faqSchema` (adds FAQ structured data), spacing and colours. Published as `<details>`/`<summary>`. |
| `fromName("core/accordion-item", …)` | `core/accordion-item` | Content `{ title, open }`; its children are the answer (any blocks). |
| `fromName("core/popup", …)` | `core/popup` | Content `{ name, slug, size, closeButton, closeOnBackdrop, bottomOnPhones, backdropColor, backdropBlur, animation, background, radius, padding }`; children are anything. Opened by any link to `#popup-<slug>` (see below). |

### Opening a popup

Point any link at `#popup-<slug>` — a button's `url`, a header action's `href`, an icon's `link`. Nothing else is needed; a page address ending in `#popup-<slug>` also opens it on arrival. Keep slugs unique per page (`[a-z0-9-]`).

### Icon references

`{ iconSet, iconName, size?, color?, … }` on Icon and Button blocks. Published pages only ship Lucide, so:

| `iconSet` | Needs | Notes |
|---|---|---|
| `lucide` | `iconName` (kebab-case) | Drawn by name. |
| `react-icons` | `iconName` (`prefix:Name`) + `svg` | `svg` = the icon's drawing (the editor fills it when picked or when an older page opens). Without it the published page shows a placeholder. |
| `svgl` | `url` (`/uploads/…svg`) + `label` | Brand logo copied into the media library (`POST /api/media/svgl` with a `https://svgl.app/library/*.svg` url). |
| `custom` | `url` (`/uploads/…` svg/png/webp) | Your own upload. `tint: true` paints a one-colour picture in `color`. |

Saves refuse drawings that are not clean SVG and pictures outside this site's uploads.

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
core/columns, core/container, core/group, core/stack, core/page-shell,
core/header, core/accordion, core/accordion-item, core/popup,
core/quote, core/list, core/media-text, core/cover, core/file,
core/code, core/html, core/pullquote, core/preformatted, core/table,
core/markdown, core/icon, core/divider, core/input, core/textarea,
core/select, post/title, post/excerpt, post/featured-image, post/list,
post/toc, post/author-box, post/comments, post/navigation, post/info,
post/progress
```

Text alignment lives on `styles.textAlign` only. An old `content.textAlign` on heading / paragraph / quote / pullquote is moved into styles when the page is saved.

---

## Page defaults

SDK blocks automatically receive editor shell defaults (`20px` padding, token `units`, registry `defaultStyles`).  
`pages.create()` and `posts.create()` merge `buildDefaultPageOther()` internally — same design/icons baseline as dashboard Page Settings. Pass `other` only for overrides.

### Multi-column example

```ts
nextpress.blocks.columns({
  columnCount: 2,
  settings: { styles: { gap: "20px" } },
  children: [
    nextpress.blocks.paragraph({ text: "Left" }),
    nextpress.blocks.paragraph({ text: "Right" }),
  ],
});
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

## Check a tree before you save it

Three pure helpers (no network) tell you what is wrong with blocks before you send them:

- `validateBlockTree(blocks)` checks the structure: unknown block names, repeated ids, a block in the wrong place in the catalog, children inside a block that cannot hold any.
- `checkPage({ blocks })` does that **and** applies the rules the server applies when a page is saved, plus the page-shell rules (one shell, only at the top) and the phone-layout check. It returns `{ ok, problems }`. Each problem has a `kind` (`structure`, `save`, `placement` or `phone`), the `blockId`, a plain `message` and often a `fix`. `ok` is `false` for the first three kinds only; phone problems are warnings.
- `outlinePage({ blocks })` writes a short indented outline, one line per block with its id, label and the first words of its text. It is meant for a person or an AI agent to read before touching a big page.

```ts
import { checkPage } from "@nextpress-org/sdk";

const { ok, problems } = checkPage({ blocks });
if (!ok) console.error(problems.map((p) => `${p.kind}: ${p.message}`));
```

`buildBlockFromSpec({ spec, parentId, newId })` builds one block from a plain description (`{ name, content?, styles?, children? }`) the way the editor would insert it, then lays your content and styles over the defaults. It returns `{ ok: true, value }` or `{ ok: false, message }`.

See [Page builder](./page-builder.md#agent-tools) for the ready-made tools that use these helpers.

---

## Validation

Block inputs are validated when passed to resource methods (`pages.create`, `pages.update`, etc.) via Zod schemas in `packages/sdk/src/schemas/`. Invalid media URLs (e.g. `javascript:`) throw locally before HTTP.

See [Errors and validation](./errors-and-validation.md) and [Versioning](./versioning.md).
