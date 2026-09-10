# Intent — Post overlay + showcase site

Date: 2026-09-10
Status: APPROVED by owner in chat (“lets go”, SDK/MCP gaps first, then CMS showcase)

## What

1. Post List can open details in an overlay (grid stays the index).
2. Published post lists show real posts, not dummy cards (SSR + public SPA).
3. Public JSON list for visitors (`GET /api/public/posts`). Public post includes rendered HTML for the overlay.
4. SDK: `public.posts()`, `openIn` on `postList`. MCP: blogs, `publish_post`, `preview_post`.
5. Seed a published showcase homepage + CMS posts via SDK against the running local site.

## Why

Showcase needs CMS-managed posts, a grid on the home page, and details without leaving the index. Overlay and live lists were missing; MCP could not look up blogs or publish posts in one step.

## How

- Shared bind helper injects published posts into `post/list` content.
- SPA uses the live Post List block (public posts API) + dialog overlay + hash `#post/{slug}`.
- SSR cards + one vendor script fetch `/api/public/post/:slug` and fill a `<dialog>`.
- Grid CSS: 1 / 2 / 3 columns by viewport.
- Showcase script creates a blog, posts, homepage with `layout: grid` and `openIn: overlay`, then sets `homepage_page_slug`.

## Impact

- Public API: new list route; post GET adds `renderedHtml`.
- Editor Post List settings: Open in Overlay / Full page.
- MCP tool list grows (tests that snapshot names must update).
- Existing post lists keep `openIn: page` unless set; default for new lists is overlay.

## Verification

- Unit tests: bind helper, public SDK mock, MCP tool names.
- Browser: homepage grid, click card → overlay, close, mobile width.
