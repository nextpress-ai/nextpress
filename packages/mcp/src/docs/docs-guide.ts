/** Where the docs guide is read as a resource. */
export const DOCS_GUIDE_URI = "nextpress://docs/guide";

/**
 * The one short guide an agent reads before it builds or fills a docs. The `write_docs` prompt, the
 * `nextpress://docs/guide` resource and the `get_docs_guide` tool all send this one text, so an agent
 * gets the same rules whichever way it asks.
 */
export const DOCS_GUIDE = `# Making docs in NextPress

A docs is a set of ordinary pages with a header, a sidebar and search around them. The docs tools
make and arrange the pages; the content of each page is written with the normal page and block tools.

## Make the docs

- list_docs shows the docs on the site. Make a new one with create_docs only when none fits.
- get_docs_tree shows every page and group in sidebar order, with ids and addresses.
- update_docs_settings changes the header, logos, links, button, search and the frame switches.

## Add and arrange pages

- add_docs_page adds a page (it holds content) or a group (a sidebar heading that holds pages).
  Put it under a page or group with parentId, or leave parentId out for the top of the docs.
- update_docs_page renames a page, changes its address, moves it under another page or group, or hides it.
- reorder_docs_pages sets the order of the pages under one parent. Send every page, each once.
- delete_docs_page deletes a page or group. Move or delete the pages under it first.
- Pages start as drafts. Use publish_page only when the owner asks.

## Write a page

A new page is empty. Fill it the same way as any page: read it with get_page, then change its blocks
with patch_page_blocks (build_blocks and validate_blocks help check a block before it is saved).

- Start with a short opening paragraph that says what the page covers.
- One idea per page. Use headings for sections; the page title already takes the top heading.
- Plain text blocks: core/heading, core/paragraph, core/list, core/quote, core/code, core/image,
  core/table, core/button.
- Docs components: docs/callout (note, tip, warning, danger, check), docs/code-group (the same
  command for several tools), core/steps (things done in order), core/tabs (one option of several),
  core/card (a link to another page, for overview pages), core/accordion (an answer most readers
  do not need), docs/file-tree (a folder layout), docs/params (options and fields with their
  types), docs/example (code beside its result), docs/diagram (a flow), docs/update (a release note).
- Plain text does most of the work. Use a component when it helps the reader, not for decoration.
- Write short sentences to "you". Use the names the screens use. Link to other docs pages by the
  addresses get_docs_tree lists.
- Upload pictures with upload_media and give each image alt text.

## Finish

Leave every page as a draft. Tell the owner which pages you made and what to check.
`;
