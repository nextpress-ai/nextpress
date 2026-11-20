---
title: Roles
description: The four roles a person can hold on a site, exactly what each one allows, and the extra reach of the main site's owner and admins.
order: 1
type: Reference
---

# Roles

A role decides what a person can see and change on one site. Roles are set per site, so one person can be an editor on one site and an admin on another. The server checks every action against the role. The admin menu only hides what a person cannot use.

## The roles

| Role | What the role allows |
|---|---|
| **Subscriber** | Sign in, comment and keep a profile. No dashboard |
| **Editor** | Pages, posts, blogs, media, templates, forms and their answers, WordPress import and previews. Moderate comments. Use the page assistant |
| **Admin** | Everything an editor can do, plus the site's settings, address, theme, API keys, AI settings, and people and invite links |
| **Owner** | Everything an admin can do. The owner's role cannot be changed or removed by others |

## Sidebar screens by role

| Screen | Subscriber | Editor | Admin and owner |
|---|---|---|---|
| Posts, Pages, Media, Forms | No | Yes | Yes |
| Comments | No | Yes | Yes |
| Templates, Import WordPress | No | Yes | Yes |
| Themes, Sites, Settings | No | No | Yes |
| People | No | No | Yes |
| Your account | No | Yes | Yes |
| Plugins | No | No | Main site only |

Subscribers have no dashboard, so they see none of these screens.

## The main site

The main site is the default site of the install, the one that answers any address no other site uses. Its owner and admins have extra reach across the whole install:

- See and start NextPress updates from the dashboard.
- Add and delete sites.
- See every account in the **Everyone** tab of **People**, and add accounts with **Add account**.
- Manage plugins.
- Save an AI service address on the server itself or the private network.

## Rules for changing roles

- Nobody can change their own role.
- Nobody can change the role of a person with a higher role.
- An invite link can give at most the role of the person who makes it.
- The site's owner always keeps full access.

## API keys and roles

An API key acts as the person who made it. A key never does more than that person's role allows on its site, whatever permissions it lists. See [API keys](/docs/developers/api-keys).

## Next steps

- [Invite people and manage roles](/docs/people/roles-and-invites).
- [Passwords and reset](/docs/people/passwords-and-reset).
- [Comments](/docs/content/comments) for moderation.
