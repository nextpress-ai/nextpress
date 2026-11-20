---
title: Menus, headers and footers
description: Build a site header with links and buttons, choose how it behaves on phones, and share one header or footer across many pages with a template.
order: 6
type: Guide
---

# Menus, headers and footers

A header is the bar across the top of a site: the site's name or logo, links to the main pages, and often a button such as "Contact". NextPress builds it with the **Header** block. A footer is built from ordinary blocks, usually a **Group**. To show the same header or footer on every page, put it in a template.

## Build a header

1. Open a page in the page builder.
2. In the **Blocks** panel, open **Layout** and drag **Header** to the top of the page.
3. Select it. In the **Content** tab, pick a layout:
   - **Links + buttons**: name on the left, links and buttons on the right.
   - **Links**: name on the left, links on the right.
   - **Split**: name on the left, links in the middle, buttons on the right.
   - **Buttons**: name on the left, buttons on the right.
   - **Blocks**: name on the left, your own blocks on the right, such as a search box.
4. Under **Brand**, choose the **Kind**, then set the **Name** or **Logo**, and the **Link**.
5. Under **Links**, set each link's **Label** and **URL**. A link can hold a dropdown of items.
6. Under **Buttons**, set each button's **Label** and **URL**.
7. Press **Save**.

The **Layout** section has **Float on scroll**, **Match page padding** and **Sit over the first section**. **Reading progress** adds a progress bar under the header.

## Choose how it looks on phones

1. Press the mobile preview button in the top bar.
2. Select the header. In its settings, set **On a phone**:
   - **Menu** hides the links behind a button. This is the default.
   - **Links** keeps the links in the bar.
3. When parts crowd a phone, set **Name**, **Links** or **Buttons** to **Both**, **Desktop** or **Mobile** to choose where each one shows.

The tablet preview follows the desktop choices.

## Share a header across pages

1. Open **Templates** in the sidebar, under **Appearance**.
2. Press **New template**.
3. In **Name**, type "Site header". In **Starts as**, choose **Header**.
4. Press **Create and open**.
5. Build the header as above, then press **Save**.
6. Open each page that should show it. Open the **Templates** group under the block list and click **Site header**. It is added at the end of the page.
7. Drag the new **Template** block to the top of the page, then press **Save**.

To change the header later, edit the template. Every page that shows it updates. The **Templates** screen shows how many pages use each template.

## Share a footer across pages

Follow the same steps with **Starts as** set to **Group**. The template is added at the end of the page, where a footer belongs. A sign-up form can go inside the footer. See [Forms](/docs/building-pages/forms).

## Use a different header on one page

1. On that page, select the **Template** block.
2. Press **Detach** and confirm. The header's blocks stay on this page as ordinary blocks.
3. Change them, then press **Save**.

Other pages keep the shared header.

## Next steps

- [Templates and themes](/docs/building-pages/templates-and-themes) for how templates behave.
- [Publishing and previews](/docs/building-pages/publishing-and-previews).
- [Blocks overview](/docs/building-pages/blocks-overview).
