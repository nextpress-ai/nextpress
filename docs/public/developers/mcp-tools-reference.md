---
title: MCP tools reference
description: Every tool, prompt and resource the NextPress MCP server offers, grouped by the job they do, with the permission each group needs.
order: 5
type: Reference
---

# MCP tools reference

An agent connected through the [MCP server](/docs/developers/mcp-server) sees these tools and picks which to call. Every call uses the server's API key, so each tool needs the matching [permission](/docs/developers/api-key-permissions).

## Edit a page or post

Each tool works on one saved page, or on a blog post when `content_type` is `"post"`.

| Tool | What it does |
|---|---|
| `get_page_outline` | Lists the page's blocks with their IDs, without full content |
| `get_page_block` | Reads one block. `id` is the page, `block_id` the block |
| `change_page_blocks` | Adds, changes, moves or removes blocks, then saves and checks the page. Refused when the page changed since it was read |
| `check_page` | Checks the page for problems |
| `apply_page_phone_fixes` | Applies the fixes for phone layout warnings that have a clear fix |

## Blocks and design

| Tool | What it does |
|---|---|
| `list_block_types` | Lists block types and when to use each |
| `get_block_type` | Shows one block type's fields, with an example |
| `get_design_guide` | Returns the page design guide |

## Pages, posts and blogs

| Tool | What it does |
|---|---|
| `list_pages`, `get_page` | List pages, or read one page by UUID or slug with all its blocks |
| `create_page` | Create a page. It is a draft unless told otherwise |
| `update_page` | Change title, slug, status, or replace all blocks. Needs `expectedVersion` |
| `publish_page` | Publish a page |
| `list_posts`, `get_post` | List posts, or read one |
| `create_post`, `update_post` | Create a draft post, or change it. Updates need `expectedVersion` |
| `publish_post` | Publish a post |
| `list_blogs`, `get_blog`, `create_blog` | List blogs, read one, or create one |

## Previews and history

| Tool | What it does |
|---|---|
| `preview_page`, `preview_post` | Create a link that shows a draft without signing in. Lasts 3600 seconds unless a shorter `expiresInSeconds` is given. The most is 3600 |
| `get_page_history` | List a page's earlier saved versions |
| `restore_page_version` | Put an earlier version back. The replaced version stays in the history |

Version history exists for pages only, and only the SDK and MCP server can restore it. The admin has no screen for it.

## Templates, themes and site

| Tool | What it does |
|---|---|
| `list_template_parts` | List the site's templates, with how many pages use each |
| `create_template_part` | Create a template |
| `get_template_part_usage` | List the pages that show a template |
| `list_templates`, `get_template` | List or read pre-designed blocks |
| `list_themes`, `get_theme` | List or read themes |
| `create_theme`, `update_theme` | Create or change a theme |
| `activate_theme` | Make a theme the site's active theme |
| `get_site_context` | Read the site's branding, active theme, settings and health |

## Media and forms

| Tool | What it does |
|---|---|
| `list_media` | List the media library, up to 100 items per call |
| `upload_media` | Upload a file from a local path, or from base64 with a `filename` |
| `copy_brand_logo` | Save a brand logo from svgl.app, such as `https://svgl.app/library/github.svg`, into the media library |
| `list_form_submissions` | Read the answers sent through the site's forms. Read only |

## Docs

`list_docs`, `create_docs`, `get_docs_tree`, `update_docs_settings`, `add_docs_page`, `update_docs_page`, `delete_docs_page`, `reorder_docs_pages` and `get_docs_guide` work with documentation sites built in NextPress. They use the page permissions.

## Older tools

`build_blocks`, `validate_blocks`, `patch_page_blocks` and `patch_post_blocks` still work. New work should use `change_page_blocks`.

## Prompts

| Prompt | Arguments | What it starts |
|---|---|---|
| `build_page` | `purpose`, `audience` (both optional) | Building a page from a draft to a preview link |
| `edit_block` | `id`, `block_id`, `request` | Changing one block and nothing else |
| `write_docs` | `topic`, `audience` (optional) | Writing documentation pages |

## Resources

| Address | What it holds |
|---|---|
| `nextpress://blocks/catalog` | Block names with a note on when to use each |
| `nextpress://blocks/schema` | The shape of block data |
| `nextpress://design-guide` | The page design guide |
| `nextpress://site/map` | Pages and posts: address, title and status |
| `nextpress://site/context` | Branding, theme, settings and health |

## When a tool is refused

The reply always gives the reason. Common ones are a missing permission on the key, a page that changed since it was read, or a block that is not allowed in that place.

## Next steps

- [MCP server](/docs/developers/mcp-server).
- [Block reference](/docs/developers/blocks-reference).
- [SDK](/docs/developers/sdk).
