---
title: What NextPress is
description: The main ideas in NextPress, what each one is for, how a visit reaches your site, and what beta means for you.
order: 1
type: Concept
---

# What NextPress is

NextPress is a self-hosted publishing platform. You keep the server, the database and the uploaded files. Everything you publish is served from your own machine, at your own domains.

## The main ideas

- **Site.** One website with its own address, pages, posts, media, settings and theme. One install can hold several sites. The site picker at the top of the admin decides which site you are working on.
- **Page.** A document you design freely in the page builder, such as a home page, a pricing page or an about page.
- **Blog and post.** A blog is a list of posts. A post is an article in a blog. How a blog's posts look is set once for the whole blog.
- **Block.** One piece of a page: a heading, a paragraph, an image, a set of columns, a form. Some blocks hold other blocks.
- **Template.** A block you build once and show on many pages, such as a header or footer. A change to the template shows on every page that uses it.
- **Theme.** The colors and fonts of a site. Each site has one active theme.
- **Role.** What a person may do on one site: subscriber, editor, admin or owner.

Short definitions of these and other terms are in the [Glossary](/docs/getting-started/glossary).

## What it is for

- Building marketing and information pages without writing code.
- Publishing documentation sites with their own navigation and search.
- Running a blog with comments.
- Collecting form submissions and exporting them.
- Reusing designs through templates, template parts and themes.
- Running several sites from one server.
- Letting scripts and AI agents create and change content through an API key, while people keep working in the admin.

## How a visit works

1. A visitor opens your address. The request reaches Caddy, the web server.
2. Caddy holds the HTTPS certificate for that address and passes the request to the NextPress app.
3. The app finds the site that owns the address. An address no site uses goes to the default site.
4. The app reads the published page from the database and sends it back.

Drafts, private pages, pages in the trash and password-protected pages are never sent to visitors. They answer "Page not found".

The preview in the editor uses the same code that renders the live site, so a preview shows the page as visitors will see it.

## What it does not do

- It sends no email of any kind.
- It does not include an AI service. An admin connects one and adds a key.
- It does not restore backups on its own. `nextpress restore <file>` puts a database backup back when you ask it to.
- It does not resize uploaded pictures. Each picture is served as you uploaded it.

## Beta

NextPress is in beta. Core features work, and some areas still change between releases. Before each upgrade, keep an export of your data somewhere other than the server. See [Back up and move your data](/docs/self-hosting/backups-and-moving).

## Next steps

- [Install NextPress](/docs/getting-started/install) on a server or on your computer.
- [Make your first page](/docs/getting-started/first-page) to see the editor.
- [Read the glossary](/docs/getting-started/glossary) for every term in one place.
