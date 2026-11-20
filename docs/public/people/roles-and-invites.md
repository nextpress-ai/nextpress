---
title: Invite people and manage roles
description: Invite people to a site with a link, cancel a link, change a person's role, take someone off a site, and let visitors sign up.
order: 2
type: Guide
---

# Invite people and manage roles

People join a site through an invite link. You choose the role the link gives, how many people can use it, and how long it works. You need the admin or owner role on the site. What each role allows is in [Roles](/docs/people/roles).

## Create an invite link

1. Pick the site in the site picker at the top of the admin.
2. Open **People** in the sidebar, under **System**.
3. Press **Invite people**.
4. Under **Role**, pick **Subscriber**, **Editor** or **Admin**. You can pick only roles up to your own. **Editor** is chosen at first.
5. Under **How many people can use it**, pick **One person**, **Up to…** with a number from 1 to 1000, or **No limit**.
6. Under **Link ends after**, pick **1 day**, **7 days**, **30 days** or **Never**. **7 days** is chosen at first.
7. In **Note**, you may add a reminder of who it is for. Only admins see it.
8. Press **Make link**.
9. In **Your invite link**, press **Copy** next to **Share this link**, and send the link to the person.
10. Press **Done**, or **Make another** for a second link.

## What the invited person does

1. They open the link. It shows "Join" and the site name, with the role they will get.
2. If they are not signed in, they fill in **Your name**, **Username** (at least 2 characters), **Email** and **Password** (at least 8 characters).
3. They press **Join**.

If the link has ended, has no places left or was cancelled, they see "This link can't be used any more" and are asked to get a new link from the site's admin. If the email already has an account, they are asked to sign in first, then open the link again.

## Cancel an invite link

1. On **People**, find the link under **Invite links**.
2. Press **Cancel this link**.
3. Confirm in **Cancel this invite link?**.

Nobody new can join with it. People who already joined keep their role.

## Change a role or take someone off a site

1. On **People**, find the person in the list for the site.
2. To change the role, pick a new one in the role list on their row.
3. To take them off the site, press the remove button on their row, then **Take off site**.

A row is locked when it is your own, the site's owner, or a person with a higher role than yours. Hover over the lock to see why.

## Add an account directly

Owners and admins of the main site have an **Everyone** tab on **People**. On it, **Add account** creates an account with **Name**, **Username**, **Email** and **Password**.

## Let visitors sign up

1. Open **Settings**, then the **Discussion** tab.
2. Turn on **Let visitors create an account**.
3. Press **Save Changes**.

Visitors then sign up at `/admin/register` and get the subscriber role on that site. To bring a subscriber onto the team, change their role on **People**.

## Next steps

- [Roles](/docs/people/roles).
- [Passwords and reset](/docs/people/passwords-and-reset).
- [API keys](/docs/developers/api-keys) to give a script its own access.
