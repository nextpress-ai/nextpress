import type { BlockName } from "./block-names.js";

/**
 * How an agent should use each block: what it is for, what it is not for, and
 * the one or two fields that matter. The MCP server and the in-editor assistant
 * show these next to the catalog, so a wrong note means wrong pages. Keep each
 * note short and checked against the block's real content shape.
 */
export const BLOCK_AGENT_NOTES: Record<BlockName, string> = {
	"core/page-shell":
		"The page itself: exactly one, at the root, and every other block sits inside it. An empty page gets one automatically with its first block, so don't insert it yourself. Page font, content width (`containerWidth`), side and top/bottom padding (`paddingInline`, `paddingBlock`) and page background live here, not on sections.",
	"core/header":
		"The site header: brand (logo or name), links and buttons. Put it first inside the page shell. `variant` picks the layout; `brand-and-blocks` takes child blocks on the right instead of built-in links. `overFirstSection` floats it over a hero, `sticky` keeps it on screen while scrolling.",
	"core/stack":
		"The default section container. `stackType` is `vertical` (blocks under each other), `horizontal` (a row) or `overlay` (children layered in one spot, first child at the back — for a hero with text over an image; give the back picture or video `fillBehind: true` so it covers the section instead of setting its height). Spacing between children is `styles.gap`.",
	"core/group":
		"A plain layout container (flex column with a gap by default). Use it to keep related blocks together, or as a row/grid with `styles.display`, `flexDirection`, `gridTemplateColumns`. `tagName` sets the HTML tag (`section`, `div`, …).",
	"core/container":
		"A box with background, padding, rounded corners and a max width. Use for cards and boxed sections. For plain grouping use Group or Stack instead.",
	"core/columns":
		"Side-by-side columns that fold under each other on phones. Each child is one column, so wrap a column's blocks in a Group. Best: give all its columns as `children` in the same insert. A block inserted into it later becomes a new column (or fills an empty one), and the columns stay equal width. `reverseOnPhones: true` stacks them in reverse on phones (a picture on the right goes on top). Use for 2–3 columns; for cards or anything that should wrap, use Grid.",
	"core/accordion":
		"Questions or sections that open and close (FAQ). Children must be Accordion item blocks. `faqSchema` adds FAQ data for search engines — turn it on for at most one accordion per page.",
	"core/accordion-item":
		"One question inside an Accordion: `title` is the question, its children are the answer (any blocks). Only use inside an Accordion.",
	"core/popup":
		"A window over the page. It stays hidden until a link points at `#popup-<slug>` (a button's `url`, a header button's `href`). Keep `slug` unique on the page (`a-z`, `0-9`, `-`). Children are anything, a form included.",
	"core/form":
		"A form whose answers appear in Admin → Forms. Children are fields (Text field, Text area, Dropdown) and one Button with `action: \"submit\"`. Every field needs a `name` and a visible `label`.",
	"core/input":
		"A one-line form field (`type`: text, email, number, tel, url, search, password). Needs `name` and `label`; `required` for must-fill fields. Only inside a Form.",
	"core/textarea":
		"A multi-line form field for messages. Needs `name` and `label`. Only inside a Form.",
	"core/select":
		"A dropdown form field. `options` (`label`, `value`) are the choices; the answer is saved as the chosen option's visible text. Only inside a Form.",
	"core/template-part":
		"Shows a linked template (a shared header, footer or section), so one edit reaches every page. Only use with a template id that exists on this site; never invent one.",
	"core/grid":
		"Equal items side by side that wrap to new rows: feature cards, team, plans. Put each item as a child (usually a Card). `columns` (1–6) on desktop, `tabletColumns`, `phoneColumns` (usually 1); or `minItemWidth` (\"240px\") to fit as many as there is room for. Spacing is `styles.gap`. Prefer it over Columns for more than two or three items.",
	"core/card":
		"A box for one feature, plan, person or link, holding any blocks (icon, heading, text, button). `title` is an optional heading at its top. `look`: bordered, raised, subtle or plain. To make the whole card a link, set `link` and `linkLabel` (what a screen reader says); buttons inside still work. Usually inside a Grid.",
	"core/badge":
		"A small label: the eyebrow above a section heading (\"New\", \"Pricing\") or a status. `text`, `tone` (accent, neutral, success, warning, danger), `look` (soft, outline, solid). Keep it to one or two words.",
	"core/steps":
		"Numbered steps for a how-to, an install guide or \"how it works\". Each child is a Step. `layout`: vertical (a timeline) or horizontal (a row with arrows, a timeline on phones); `marker`: number or dot.",
	"core/step":
		"One step inside Steps: `title`, with the explanation as child blocks (paragraph, code, image). Only inside Steps.",
	"core/tabs":
		"Content that switches when a tab is chosen: install commands per package manager, plans per period, examples per language. Each child is a Tab; the first is open. `look`: underline, pills or segmented.",
	"core/tab":
		"One tab inside Tabs: `title` on the tab bar, with its content as child blocks. Only inside Tabs.",
	"core/search":
		"A search button (with a Ctrl/⌘ + K hint) that opens a search window over this site's published pages. Put one in the header or the top of a docs page. `label` is the button text, `placeholder` the hint in the empty search box. Nothing to configure beyond those; add at most one per page.",
	"core/docs-layout":
		"Legacy: for new pages use docs/shell with docs/page. Kept so existing pages keep working. Wraps a documentation page: a sidebar of the site's pages on the left, the page's content in the middle, and an \"On this page\" list on the right, with breadcrumbs and previous/next links. Use it on every docs page, inside the page shell. The sidebar comes from the pages' parents: set a page's parent to put it under another page, and its menu order sets the sequence. `rootPageId` picks the page the sidebar starts from (empty: the top page of the section this page is in). `showToc`, `showPrevNext`, `showBreadcrumbs` and `copyPage` (Copy page and Open as markdown buttons) are on by default. Don't put a header or footer inside it, and use at most one per page.",
	"docs/shell":
		"The docs frame for a documentation site: a top bar (the site name or logo, a search button, up to six links) and a sidebar of the site's pages. Put it directly inside the page shell, once per page; it holds exactly one Docs page. Set it up once on the docs home page. Every other docs page leaves `inherit` true and reads the home page's settings, so don't repeat them. `rootPageId` (empty: the top page of the section), `title` (empty: the home page's title), `logoUrl`, `links` ({label, url}), `search` ({show, label, placeholder}). The sidebar comes from the pages' parents and menu order. Replaces core/docs-layout.",
	"docs/page":
		"One page of documentation, only directly inside Docs shell. It draws breadcrumbs, the page's own title and description (the page title and its search description; don't add a heading for them), Copy page, an \"On this page\" list from the headings below, and previous/next links. Put the page's blocks inside it (headings level 2 and 3, text, callouts, code). `showTitle`, `showDescription`, `showBreadcrumbs`, `showToc`, `showPrevNext` and `copyPage` are all on by default.",
	"docs/callout":
		"A highlighted note around other blocks. `type`: note (default), tip, warning, danger or success; `title` is an optional bold line. Its children are the message (usually one paragraph). Keep it short, and don't stack several in a row.",
	"docs/code-group":
		"Several code blocks shown as tabs: the same command for npm, pnpm and yarn, or one example in several languages. Each child is a code block; its `title` is the tab label (else its language). The reader's choice is remembered across the site (`remember`).",
	"docs/file-tree":
		"Folders and files drawn as a tree. `tree` is text: one line per entry, two spaces per level, folders end with `/`, ` *` at the end highlights a line, `# words` adds a note.",
	"docs/params":
		"A list of options, props or API fields. `items` is a list of {name, type, default, required, description}; description is short markdown. Use one per group of fields, under a heading.",
	"docs/example":
		"Code beside what it makes: the first child is a code block, the other children are the result built from ordinary blocks (nothing runs). `layout`: side (side by side, stacked on phones) or stacked.",
	"docs/diagram":
		"A diagram drawn from Mermaid text in `code` (flowcharts, sequence diagrams, state machines). `caption` is an optional line under the picture. Use it when a picture of a flow or of steps explains more than words. Write the Mermaid plainly: a mistake shows a short message in place of the picture.",
	"docs/update":
		"One changelog entry: `label` is its version or date (\"v1.4.2\", \"October 2026\") and shows in a narrow column; `description` is one short line under it. Its children are the notes for that release (headings, text, lists, callouts, diagrams). Each entry can be linked from \"On this page\".",
	"core/logo-cloud":
		"Logos of customers or partners. `logos` is a list of {url, alt, href}; take urls from list_media. `layout`: row (`marquee: true` scrolls it) or grid (`columns`); `grayscale` makes them quieter. Alt text is the company name.",
	"core/heading":
		"A title. `value` is the text, `level` 1–6. One level-1 heading per page (the main title); sections use level 2, points inside them level 3. Alignment goes in `styles.textAlign`, never in content.",
	"core/paragraph":
		"Body text in `value`. Keep paragraphs short; use several rather than one long one. For bold or links inside the text, put simple HTML in `value` and set `format: \"html\"`.",
	"core/button":
		"One call to action. `value` is the label, `url` the target: `/contact` for a page on this site, a full address for elsewhere, `#popup-<slug>` to open a popup. `action: \"submit\"` only inside a Form. Use one main button per section.",
	"core/buttons":
		"A row of simple buttons kept inside its content (`buttons`: text, url, linkTarget), not as child blocks. For buttons with their own look, put Button blocks in a horizontal Stack instead.",
	"core/list":
		"A bulleted or numbered list. `values` is the items as `<li>…</li>` HTML; `ordered: true` for numbers. `marker` for bullets: default, check (feature or plan lists), arrow, dash, none.",
	"core/quote":
		"A quotation: `value` is the quote as HTML (`<p>…</p>`), `citation` who said it.",
	"core/pullquote":
		"A short, large quote that stands out from the text around it. Use sparingly; for testimonials a Container with a paragraph and a name often reads better.",
	"core/table":
		"Rows and columns of data: `head`, `body` and `foot` rows, each with `cells` (`content`, `tag`). Use for real tabular data (prices, specs), not for page layout.",
	"core/code":
		"A code sample, colored by language (`content`, `language` such as ts, bash, python). `title` shows a file name above it, `highlightLines` marks lines (\"2, 4-6\"). Only for code samples.",
	"core/preformatted":
		"Text that keeps its spaces and line breaks exactly (`content`). Rarely needed outside technical pages.",
	"core/html":
		"Raw HTML (`content`), cleaned before it is shown. Last resort when no block fits; prefer real blocks so people can still edit the page.",
	"core/markdown":
		"Text written in Markdown (`content`): headings, lists, tables, links and fenced code (```ts {2} title=\"app.ts\"), ```mermaid diagrams. Best for docs and long articles; for page sections prefer Heading and Paragraph blocks.",
	"core/icon":
		"An icon. Set it as `icon: {\"iconSet\": \"lucide\", \"iconName\": \"arrow-right\"}` — `iconName` is a kebab-case Lucide name (`check`, `zap`, `star`) and must sit inside `icon`; published pages draw Lucide by name. `link` makes it clickable.",
	"core/spacer":
		"Empty vertical space (`height`). Prefer `styles.gap` or padding on the parent; use a spacer only for one-off breathing room.",
	"core/separator":
		"A thin line between parts of the content (`lineStyle`: solid, dashed, dotted).",
	"core/divider":
		"An older horizontal line, hidden from the block library. Use Separator instead.",
	"core/image":
		"One picture. `url` from this site's media library (`/uploads/…`) or the placeholder; always write a real `alt` that says what the picture shows (empty only for pure decoration).",
	"core/gallery":
		"Several pictures in a grid (`images`, `columns`). Each image needs its own `alt`.",
	"core/video":
		"A video player: an uploaded file or a YouTube address in `url`. For a silent looping background video set `autoplay`, `muted`, `loop` and `playsInline` together.",
	"core/audio":
		"An audio player for an uploaded sound file (`url`).",
	"core/file":
		"A download link for an uploaded file (PDF, document).",
	"core/cover":
		"One image or video with a short piece of text over it (`innerContent`, HTML) and a dark overlay (`dimRatio`). For a hero with real blocks on top (heading, buttons, form), use a Stack in `overlay` mode instead.",
	"core/media-text":
		"A picture beside text (`mediaUrl`, `mediaPosition`, `content` as HTML); stacks on phones. Good for feature rows.",
	"post/title":
		"The current post's title. Only on post templates and inside posts.",
	"post/excerpt":
		"The current post's summary. Only on post templates and inside posts.",
	"post/featured-image":
		"The current post's main picture. Only on post templates and inside posts.",
	"post/list":
		"A list or grid of published posts from a blog. Works on any page (a blog landing page, \"Latest news\").",
	"post/toc":
		"A table of contents built from the headings on the page. Use on long posts or guides.",
	"post/author-box":
		"The post author's picture, name and bio. Only on post templates and inside posts.",
	"post/comments":
		"Comments and a comment form for the current post. Only on post templates and inside posts.",
	"post/navigation":
		"Links to the previous and next post. Only on post templates and inside posts.",
	"post/info":
		"Date, categories, tags and reading time of the current post. Only on post templates and inside posts.",
	"post/progress":
		"A reading-progress bar. Only on long posts.",
	"post/body":
		"The writing of a written post (one made in the blog writing editor): its blocks are this block alone, and the blog's look (title, date, cover, author, comments) is put around it when the post is shown. Put writing blocks in it: core/paragraph, core/heading, core/list, core/quote, core/separator, core/image, core/gallery, core/video, core/code, docs/callout, core/table, core/button. Never on a page, never inside another block.",
};
