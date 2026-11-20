---
title: Block reference
description: Every block type with its name in the API, the SDK helper that builds it, and the group it belongs to.
order: 6
type: Reference
---

# Block reference

Each block has a type name, used when you read or write blocks through the SDK, the MCP server or the API. In code, build a block with the helper on `nextpress.blocks`. Where the table shows `fromName`, call `nextpress.blocks.fromName("<name>")`. For what each block looks like, see [Blocks overview](/docs/building-pages/blocks-overview).

## Basic

| Label | Name | SDK helper |
|---|---|---|
| Heading | `core/heading` | `heading` |
| Paragraph | `core/paragraph` | `paragraph` |
| Button | `core/button` | `button`, or `submitButton` for a form's send button |
| Buttons | `core/buttons` | `buttons` |
| Icon | `core/icon` | `icon` |
| Badge | `core/badge` | `fromName` |

## Form fields

| Label | Name | SDK helper |
|---|---|---|
| Form | `core/form` | `form` |
| Text field | `core/input` | `input` |
| Text area | `core/textarea` | `textarea` |
| Dropdown | `core/select` | `select` |

`form()` with no `children` starts with a name, an email and a message field and a send button. Pass `children` to use your own fields.

## Media

| Label | Name | SDK helper |
|---|---|---|
| Image | `core/image` | `image` |
| Gallery | `core/gallery` | `gallery` |
| Video | `core/video` | `video` |
| Audio | `core/audio` | `audio` |
| Media & Text | `core/media-text` | `mediaText` |
| Cover | `core/cover` | `cover` |
| File | `core/file` | `file` |
| Logo cloud | `core/logo-cloud` | `fromName` |

## Layout

| Label | Name | SDK helper |
|---|---|---|
| Spacer | `core/spacer` | `spacer` |
| Separator | `core/separator` | `separator` |
| Divider | `core/divider` | `divider` |
| Columns | `core/columns` | `columns` |
| Container | `core/container` | `container` |
| Group | `core/group` | `group` |
| Stack | `core/stack` | `fromName` |
| Header | `core/header` | `fromName` |
| Accordion, Accordion item | `core/accordion`, `core/accordion-item` | `fromName` |
| Popup | `core/popup` | `fromName` |
| Grid | `core/grid` | `fromName` |
| Card | `core/card` | `fromName` |
| Steps, Step | `core/steps`, `core/step` | `fromName` |
| Tabs, Tab | `core/tabs`, `core/tab` | `fromName` |
| Template | `core/template-part` | `fromName`, with content `{"templateId": "<id>"}` |

Divider is not shown in the editor's block list but is still accepted.

## Advanced

| Label | Name | SDK helper |
|---|---|---|
| Quote | `core/quote` | `quote` |
| List | `core/list` | `list` |
| Code | `core/code` | `code` |
| Custom HTML | `core/html` | `html` |
| Pullquote | `core/pullquote` | `pullquote` |
| Preformatted | `core/preformatted` | `preformatted` |
| Table | `core/table` | `table` |
| Markdown | `core/markdown` | `markdown` |
| Search | `core/search` | `fromName` |

## Post

| Label | Name | SDK helper |
|---|---|---|
| Post Title | `post/title` | `postTitle` |
| Post Excerpt | `post/excerpt` | `postExcerpt` |
| Featured Image | `post/featured-image` | `postFeaturedImage` |
| Post List | `post/list` | `postList` |
| Table of Contents | `post/toc` | `postToc` |
| Author Box | `post/author-box` | `postAuthorBox` |
| Post Comments | `post/comments` | `postComments` |
| Post Navigation | `post/navigation` | `postNavigation` |
| Post Info | `post/info` | `postInfo` |
| Reading Progress | `post/progress` | `postProgress` |
| Post body | `post/body` | `fromName` |

## Other helpers

- `nextpress.blocks.starterLayout()` returns a heading and a paragraph for an empty page.
- `nextpress.blocks.custom()` builds a plugin or custom block by name.
- `nextpress.blocks.names` lists every block name. `nextpress.blocks.isBlockName()` checks one.

## Rules

- Some blocks belong inside another: form fields inside a **Form**, accordion items inside an **Accordion**, steps inside **Steps**, tabs inside **Tabs**.
- A template has one layout block at its outer level: Group, Stack, Columns, Container, Header, Accordion, Popup or Form.
- Every block is checked when it is saved. An invalid block is refused with the reason.

## Next steps

- [SDK](/docs/developers/sdk).
- [MCP tools reference](/docs/developers/mcp-tools-reference).
- [Blocks overview](/docs/building-pages/blocks-overview).
