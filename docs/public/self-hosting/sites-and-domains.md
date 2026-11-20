---
title: Sites and domains
description: Add a site to an install, give it a domain with HTTPS, switch between sites, change the default site, and delete a site.
order: 2
type: Guide
---

# Sites and domains

One install can run several sites. Each site has its own address, pages, posts, media, settings, theme, roles and API keys. Visitors see the site whose address they typed. An address no site uses shows the default site.

## Point the domain at the server

1. At your domain provider, create an A record for the domain with the server's IP address.
2. For a main domain such as `example.com`, also add `www` if visitors should reach it with `www`.

Caddy can get an HTTPS certificate only after the domain points at the server.

## Add a site

Only owners and admins of the main site can add sites.

1. Open **Sites** in the sidebar, under **System**.
2. Press **Add site**.
3. In **Name**, type a name, such as "Shop".
4. In **Address**, type the domain, such as `shop.example.com`. The address check shows whether the domain points at this server. The address is optional and can be added later.
5. Fill in **Description** if you like.
6. Press **Create site**.

NextPress adds the address to the web server, and Caddy requests a certificate for it.

## Work on a site

- Pick the site in the site picker at the top of the admin. Pages, posts, media, settings and the theme you see all belong to it.
- Or, on **Sites**, open the site's row menu and choose **Work on this site**.

The **Sites** list marks the default site with **Default** and your current one with **Working on**.

## Change a site's address

Owners and admins of that site can change it.

1. On **Sites**, press **Edit** on the site.
2. Change **Address**.
3. Press **Save changes**.

Visitors find the site at the new address. Links to the old address stop working.

## Make another site the default

Only owners and admins of the current default site can do this. On **Sites**, open the site's row menu and choose **Make default**. The default site answers any address no other site uses, and it is the main site: its owner and admins manage updates, sites and every account.

## Delete a site

Only owners and admins of the main site can delete sites.

1. Delete or move the site's pages, blogs and media first. A site that still has any cannot be deleted.
2. On **Sites**, open the site's row menu and choose **Delete**.
3. Confirm.

The site's roles, settings and form answers go with it, and its address stops working. The default site cannot be deleted. Make another site the default first. This cannot be undone.

## Try a second site on your computer

Browsers send any address ending in `.localhost` to your own computer, with no DNS or HTTPS. Give the second site an address such as:

```text
site2.localhost:5000
```

## When something goes wrong

- **The new address does not open.** Check that the A record points at the server, and that ports 80 and 443 are open.
- **A visitor sees the default site.** The address they typed matches no site. Check the spelling on **Sites**.

## Next steps

- [Make your first page](/docs/getting-started/first-page) on the new site.
- [Invite people and manage roles](/docs/people/roles-and-invites).
- [Troubleshooting](/docs/self-hosting/troubleshooting).
