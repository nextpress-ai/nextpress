---
title: Move pages between sites
description: Export a page as a file, with or without its files and linked pages, and import it on another site as a draft.
order: 3
type: Guide
---

# Move pages between sites

You can copy a page to another site, in the same install or in another one. You export the page as a page file, then import the file on the other site. The page arrives as a draft, so nothing goes live until you publish it.

To copy blocks without a file, use **Copy all blocks** and **Paste blocks** in the page builder's **Page** menu.

## Export a page

1. Open **Pages** in the sidebar, on the site that has the page.
2. Open the page's row menu and choose **Export**. In the page builder, the same is **Page**, then **Export page…**.
3. Choose whether to turn on **Include images, videos and other files**:
   - On: the page arrives complete, in a larger file.
   - Off: a small file. Each file becomes a named placeholder to replace later.
4. If the page links to other pages, **Bring linked pages along** lists them. Tick the ones to include.
5. Press **Download file**. With linked pages, the button reads **Download** followed by the number of pages.

## Import a page

1. Pick the destination site in the site picker at the top of the admin.
2. Open **Pages** in the sidebar and press **Import page**.
3. Choose the page file, or drop it on the box. The dialog lists the page, any linked pages, the number of blocks and files, and the file size.
4. If the file carries a theme this site does not have, tick **Also add theme** to add it and switch the site to it. Leave it unticked to keep the site's current theme.
5. Press **Import as draft**.
6. Press **Open in editor** to check the page.

## When an address is taken

Each page on a site needs its own address. If an address in the file is already used, the imported page gets a new one. The result names each renamed page with its new and old address, in the form "is at /new-address because /old-address was taken". Links between the imported pages are updated to the new addresses.

## Copy blocks with the clipboard

1. In the source page, choose **Page**, then **Copy all blocks**.
2. In the destination page, choose **Page**, then **Paste blocks**, or press Ctrl+V on the canvas.
3. Choose **Add at the end** to keep the page and add the blocks after it, or **Replace this page** to replace it. **Undo** brings the old page back.

The clipboard carries pictures only, up to 2 MB each and 8 MB in total. Other files become placeholders.

## Limits

- A page file can be up to 200 MB.
- A file larger than the 10 MB upload limit is left out of the page file and becomes a placeholder.

## Check after you import

- Look at the page in the desktop, tablet and mobile views.
- Replace any placeholders.
- Check links to pages that do not exist on this site yet.
- Publish when it is ready.

## Next steps

- [Back up and move your data](/docs/self-hosting/backups-and-moving) to copy a whole install.
- [Publishing and previews](/docs/building-pages/publishing-and-previews).
- [Sites and domains](/docs/self-hosting/sites-and-domains).
