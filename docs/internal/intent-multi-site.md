# Intent: Full multi-site support

## What
Complete multi-site across schema, admin APIs, public routing, and client.

## Why
NextPress schema supports multiple sites but runtime was single-site/default-site.

## How
- Per-site slugs (pages, blogs) and options (homepage)
- Host-based public site resolution + `?siteId=` admin param
- Site CRUD API
- Scope content routes (pages, blogs, posts, dashboard, themes)
- Multi-host Caddy sync
- Admin site switcher drives all scoped APIs

## Impact
Migration `0003_multi_site.sql` required. Existing global options/homepage backfilled to default site.
