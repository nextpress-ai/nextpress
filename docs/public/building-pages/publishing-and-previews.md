---
title: Publishing and previews
description: Preview a page, publish it, update or unpublish it, set its status, password and homepage, and share a draft with someone who cannot sign in.
order: 7
type: Guide
---

# Publishing and previews

A new page is a draft. Only people who can edit the site see it. Publishing makes it visible at its address.

A page has one status, set in **Page settings**:

- **Draft**: not visible to visitors.
- **Publish**: visible at its address.
- **Private**: not visible to visitors.
- **Trash**: removed from the site.

Visitors who open a page that is not published see "Page not found".

## Preview a page

1. In the page builder, press **Preview**.
2. The page saves, then opens in a new tab as visitors will see it.

To see the live rendering while you edit, press the live preview button in the top bar. Press it again to go back to editing.

## Publish a page

1. Press **Publish** at the top right. The **Publish Page** dialog opens.
2. Check **Page URL**. Use only lowercase letters, numbers and hyphens. Changing it breaks links to the old address, and the dialog warns you.
3. Press **Publish**.

The button now reads **Published**, and a message gives the live address.

## Change a published page

On a published page, **Save** makes your changes live. Visitors see them on their next visit. Preview before you save when the change matters.

The **Published** button opens the **Update Published Page** dialog. Use it to change the address: edit **Page URL**, then press **Update**.

## Unpublish a page

1. Press **Published**.
2. Press **Move to Draft**.

The page is no longer visible to visitors.

## Make a page the homepage

The homepage is what visitors see at the site's main address. Only a published page can be the homepage. Use one of these:

- In **Page settings**, turn on **Homepage**, then press **Save Settings**.
- On the **Pages** screen, open the page's row menu and choose **Set as homepage**.
- In **Settings**, on the **General** or **Reading** tab, choose a page in **Site homepage**.

## Hide a page behind a password

In **Page settings**, type a password in **Password Protection**, then press **Save Settings**. While a password is set, the page is not shown to any visitor: it answers "Page not found", and it is left out of the site's feed. NextPress has no screen where visitors enter the password. Leave the field empty to show the page again.

## Share a draft with someone who cannot sign in

A preview link shows a draft without signing in. The editor has no button for it. Create one with the SDK or the MCP server:

- SDK: `preview.createShareToken`. The link lasts 5 minutes unless you choose a time, up to 1 hour.
- MCP: `preview_page` or `preview_post`. The link lasts 1 hour unless the agent chooses a shorter time.

The API key needs the `preview:write` permission and read access to the page or post. Anyone with the link can read the draft until it expires.

## Next steps

- [Page builder basics](/docs/building-pages/page-builder-basics).
- [SDK](/docs/developers/sdk) to create preview links.
- [Troubleshooting](/docs/self-hosting/troubleshooting) if a published page does not show.
