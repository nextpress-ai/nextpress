# Intent: WordPress Import (Phase 1 — Posts)

## What
Add WordPress REST API import for posts via adapter pattern, with discover → select → import flow.

## Why
Let users migrate content from existing WordPress sites without manual copy-paste.

## How
- **Shared**: `shared/import/wordpress/*` — types, URL normalize, WP fetch, posts adapter, mapper
- **Server**: `/api/import/wordpress/*` — discover, list, import (SSRF guard, auth, server-side fetch)
- **Client**: `/admin/import/wordpress` (Tools sidebar) + quick action on Posts list
- **Storage**: Mapped fields on `posts` row; full WP JSON in `post.other.import.raw`
- **Taxonomy**: `shared/posts/post-other.ts` enriches API responses; PostInfoBlock reads enriched fields
- **Featured image**: User chooses `reference` (external URL) or `copy` (sideload to media)

## Deferred
- Gutenberg → native blocks parser (v1 uses single `core/html` block)
- WP auth for private/draft posts
- Pages, media, comments, users adapters

## Impact
- New routes only; no schema migration
- Posts list shows "Imported" badge when `other.import` present
