---
title: Import from WordPress
description: Copy published posts and pages from a public WordPress site into NextPress, what comes across, what does not, and how to refresh an import.
order: 4
type: Guide
---

# Import from WordPress

The importer reads published posts and pages from a WordPress site's public address and turns them into NextPress posts and pages. Your WordPress site is not changed. The import screen marks this feature as experimental.

## Before you start

- The WordPress site must be public, and its `/wp-json` address must answer without a sign-in.
- For posts, the NextPress site needs a blog. See [Blogs and posts](/docs/content/blogs-and-posts).
- You need the editor, admin or owner role on the NextPress site.

## Import posts or pages

1. Open **Import WordPress** in the sidebar, under **Tools**.
2. In **WordPress site URL**, type the address, such as `example.com`.
3. Press **Discover**. NextPress lists the site's published posts and pages.
4. Pick the **Posts** or **Pages** tab.
5. Tick the items you want, up to 50 at a time.
6. For posts, choose the **Target blog**. For pages, choose the **Target site**.
7. Under **Featured images**, choose:
   - **Reference external URL**: the picture stays on the WordPress site.
   - **Copy to media library**: a copy is saved in your media library. Choose this if the WordPress site may go offline.
8. Press the import button, such as **Import 12 posts**.

The result lists anything that failed. Press **Limitations** on the import screen for the full list of what is and is not supported.

## What comes across

- Title, address, status, excerpt, featured image and body text.
- Classic editor and block editor content, turned into editable NextPress blocks where possible.

Only published items are listed, and they arrive published. They are live on your site as soon as the import finishes, so check them straight away.

## What does not come across

- Drafts and private items.
- The WordPress media library, comments, users, menus and site settings.
- Layouts from page builders such as Elementor or Divi. These arrive as HTML blocks.
- Some complex or custom blocks, which arrive as one HTML block.

## Import again to refresh

Running the import again on items you already imported updates them from the WordPress site, instead of making copies. This replaces edits you made to those items in NextPress.

## Limits

- 50 items per import.
- 10 site lookups and 5 imports a minute for each person.

## After the import

- Open each item and check it in the desktop, tablet and mobile views.
- Change links that still point at the WordPress site.
- Move any item that should not be live to draft: press **Published**, then **Move to Draft**.

## Next steps

- [Blogs and posts](/docs/content/blogs-and-posts).
- [Publishing and previews](/docs/building-pages/publishing-and-previews).
- [Troubleshooting](/docs/self-hosting/troubleshooting) if the import reports an error.
