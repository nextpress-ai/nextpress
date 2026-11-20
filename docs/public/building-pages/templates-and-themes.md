---
title: Templates and themes
description: The three ways to reuse a design in NextPress, linked templates, pre-designed blocks and themes, what each does and does not do.
order: 4
type: Concept
---

# Templates and themes

NextPress has three ways to reuse a design. They behave differently, so pick the one that fits.

| I want to | Use |
|---|---|
| Show the same header, footer or sign-up box on many pages, and change it in one place | Template |
| Start from a ready-made section, then change the copy freely | Pre-designed block |
| Set the colors and fonts of a whole site | Theme |

## Templates

A template is one layout block you design once and show on many pages. Each page shows it through a **Template** block, which stays linked to the template. When you change the template, every page that shows it changes on the next visit.

- Templates belong to one site. Open **Templates** in the sidebar, under **Appearance**.
- A template starts as one of these layout blocks: **Group**, **Stack**, **Columns**, **Container**, **Header**, **Accordion**, **Popup** or **Form**. Everything else goes inside it.
- The **Templates** screen lists each template's name, its layout block, and how many pages use it.

You make a template with **New template** on the **Templates** screen, and add it to a page from the **Templates** group under the block list. The steps are in [Menus, headers and footers](/docs/building-pages/menus-header-footer).

In a page, select the **Template** block to see **Edit template**, which opens the template, and **Detach**. Detach replaces the template on this page with ordinary copies of its blocks. Later changes to the template no longer reach this page.

What a template does not do:

- It cannot be edited from inside a page. Use **Edit template**.
- A template from another site is not shown.
- A template that shows itself is not repeated.

Deleting a template asks first and lists the pages that use it. Those pages show nothing in its place. This cannot be undone.

## Pre-designed blocks

A pre-designed block is a ready-made set of blocks, of type Header, Footer, Page, Post or Popup. Using one copies its blocks into your page. The copy keeps no link to the original.

There are three ways to use one:

- **Pre-designed blocks** group under the block list: click one to add a copy at the end of the page.
- **Start from** in the **New page** dialog: the new page starts as a copy.
- **Design** menu in the page builder: click one to replace the page's blocks with a copy. This saves the page at once.

The **Pre-designed Blocks** screen has no sidebar entry. Open it with **Create a pre-designed block** in the **Design** menu or **Create one** in the block list, shown when none exist yet, or go to `/admin/pre-designed-blocks` on your site.

## Themes

A theme sets a site's colors and fonts: heading font, body font, button font, corner radius and the color set. Each site has its own active theme.

The **Themes** screen is in the sidebar, under **Appearance**, for admins and owners. Its actions:

- **Activate** makes a theme the site's active theme. The active one reads **In use**.

- **New theme** creates one. **Import** adds one from a theme file.
- **Edit** opens a theme's settings. Built-in themes cannot be edited. Press **Copy** to make your own version.

The **Design** menu in the page builder can also switch the active theme. A theme does not change page layouts or templates.

## Next steps

- [Menus, headers and footers](/docs/building-pages/menus-header-footer) to build a shared header.
- [Blocks overview](/docs/building-pages/blocks-overview).
- [Move pages between sites](/docs/content/move-pages-between-sites), which can bring a theme along.
