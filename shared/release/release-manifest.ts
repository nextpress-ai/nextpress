import { NEXTPRESS_CONFIG } from "../../config";
import type { ReleaseHighlight } from "./release-highlight-meta";

/** In-app release notes. Consumer-facing copy only. Keep in sync with package.json on release. */
export const RELEASE_MANIFEST = {
	version: NEXTPRESS_CONFIG.version,
	releaseDate: "2026-11-05",
	highlights: [
		{
			kind: "update",
			title: "Write docs and posts with normal blocks",
			description:
				"Docs and blog posts now use the same headings, paragraphs and lists as every page. Type ## for a heading, - for a list, or / for any block, and use bold, code and links as you write. Older docs pages convert on their own.",
		},
		{
			kind: "update",
			title: "Publish a whole docs on import",
			description:
				"When you import a page file, tick Publish the pages now to make every page live as it arrives. Leave it off to look the pages over as drafts first.",
		},
		{
			kind: "fix",
			title: "Page titles no longer show an address",
			description:
				"If a site is named after its server address, the address stays out of browser tabs and search results. Settings tells you to give the site a name.",
		},
		{
			kind: "improvement",
			title: "Clearer admin screens",
			description:
				"Each admin screen names its browser tab. A search with no results says so and lets you clear it. The same thing has the same name everywhere, and a disabled Create button says why.",
		},
		{
			kind: "improvement",
			title: "Page settings in plain words",
			description: "Slug, Meta Title and Canonical URL are now Web address, Search title and Preferred web address.",
		},
		{
			kind: "fix",
			title: "Editing on a phone",
			description:
				"The side panel starts closed on small screens so the page has room, and the top bar wraps so Save and Publish are always within reach.",
		},
		{
			kind: "fix",
			title: "Posts and docs editors",
			description:
				"An empty paragraph shows where to write, a quote or list you start by typing opens ready for your words, and clicking a link in your text no longer leaves the editor.",
		},
		{
			kind: "update",
			title: "A page assistant in the editor",
			description:
				"Ask the assistant to build or change the page you are editing. Connect the AI provider you use in Settings. Your chats are kept, so you can pick up where you left off.",
		},
		{
			kind: "update",
			title: "Roles and invite links",
			description:
				"Give each person the subscriber, editor or admin role on a site, or send an invite link. The dashboard only shows what each person can do.",
		},
		{
			kind: "update",
			title: "Docs",
			description:
				"Write documentation with a sidebar, search, previous and next links, and a copy button on every page. Put your docs on your site or on a separate address.",
		},
		{
			kind: "update",
			title: "Write blog posts in their blog's look",
			description:
				"Posts open in a calm writing editor and show inside the look you set once for the whole blog. Choose whether the blog's home page lists posts as cards, a grid or a list.",
		},
		{
			kind: "update",
			title: "Linked parts",
			description:
				"Make a header, footer or any section once under Templates and use it on many pages. One edit changes it everywhere.",
		},
		{
			kind: "update",
			title: "Update from the dashboard",
			description:
				"From this version on, owners and admins of the main site see Update available in the sidebar and can update in one click. Your sites stay online while the new version downloads.",
		},
		{
			kind: "update",
			title: "Site search and a sitemap",
			description: "Add a Search block so visitors can find your pages. Search engines get a sitemap of your published pages.",
		},
		{
			kind: "improvement",
			title: "Change or reset your password",
			description:
				"Change your password from the account menu. If an admin can't sign in, a new password can be set from the server with nextpress reset-password.",
		},
		{
			kind: "improvement",
			title: "One control for padding and margin",
			description: "Every block sets its padding and margin in the same place, with ready sizes to pick from.",
		},
		{
			kind: "fix",
			title: "Menus and dialogs look right",
			description:
				"The quick search, dropdowns, menus and dialogs no longer show a thick black box, and buttons and menus show their hover colors again, in light and dark mode.",
		},
		{
			kind: "fix",
			title: "The editor matches the published page",
			description: "Block settings, page width and padding now look the same in the editor as they do for visitors.",
		},
		{
			kind: "fix",
			title: "Upgrades apply every database change",
			description: "An upgrade no longer misses database changes from the versions in between.",
		},
		{
			kind: "improvement",
			title: "Link previews show your site",
			description:
				"A shared link uses your site name and a picture: the featured image, or the first picture on the page, or your logo. Choose whether the description comes from the page, the excerpt, or the site.",
		},
		{
			kind: "fix",
			title: "Your site address opens the homepage",
			description:
				"Opening your domain shows the published homepage, with the title and description search engines should see.",
		},
		{
			kind: "improvement",
			title: "Pictures stay put while they load",
			description:
				"A picture keeps its space, with a soft shimmer until it appears. The first pictures load right away. Later ones wait.",
		},
		{
			kind: "improvement",
			title: "Header and blocks by screen",
			description:
				"Show the name, the links, or a button on desktop or mobile only, so they don't sit on top of each other on a phone. Any block can do the same. The tablet preview follows desktop.",
		},
		{
			kind: "improvement",
			title: "The next page opens sooner",
			description:
				"A published page quietly prepares the other pages on your site. The compression switch in Settings now sends those pages smaller.",
		},
		{
			kind: "improvement",
			title: "Published pages open faster",
			description:
				"A published page is saved after the first visit and reused until you save it or change the theme. Comments, post lists, the author, and next and previous posts stay up to date.",
		},
		{
			kind: "fix",
			title: "Main site addresses",
			description:
				"On the main site, a published page opens at its short address, like /contact, including when you are on localhost.",
		},
		{
			kind: "fix",
			title: "Imported pages keep their look",
			description:
				"Styles that name a block still apply after import. Include the theme and it is switched on. Google fonts used on the page come along in the file.",
		},
		{
			kind: "update",
			title: "Themes for an assistant",
			description:
				"An assistant connected to your site can list themes, create one, change its colors and type, and switch it on.",
		},
		{
			kind: "update",
			title: "Forms",
			description:
				"Add a Form block to any page. What visitors send appears under Forms, ready to read or export.",
		},
		{
			kind: "fix",
			title: "Published pages show everything",
			description: "Pages with fade-in effects, popups or a floating header no longer come up blank.",
		},
		{
			kind: "improvement",
			title: "Header spacing",
			description: "Set the header's padding and how wide its logo, links and buttons sit.",
		},
		{
			kind: "improvement",
			title: "Button icon size",
			description: "Make a button's icon smaller or bigger.",
		},
		{
			kind: "improvement",
			title: "Form layout and dropdowns",
			description:
				"Arrange form fields in rows or columns with your own spacing. Dropdown fields match your site instead of the browser's default.",
		},
		{
			kind: "improvement",
			title: "Thank-you popup",
			description: "After someone sends a form, a popup with a check mark shows your thank-you message and the form clears.",
		},
		{
			kind: "improvement",
			title: "Centre a section at a set width",
			description:
				"Give a block a max width, then pick Left, Center or Right. The mobile check now spots blocks too wide for a phone and fixes them in one click.",
		},
		{
			kind: "fix",
			title: "Page links work",
			description: "Pages open at their own short address, like /contact, so links between pages no longer lead to Not found.",
		},
		{
			kind: "fix",
			title: "Links in text look right",
			description: "Links inside text match the words around them with a soft underline, instead of the browser's bright blue.",
		},
		{
			kind: "improvement",
			title: "Tidier page and post lists",
			description: "Edit stays one click away; duplicate, export, homepage and delete sit in a ⋯ menu.",
		},
		{
			kind: "update",
			title: "Move pages between sites",
			description:
				"Export a page with its images, theme and the pages it links to, then import them on another NextPress site as drafts. Links follow if an address is taken. Or copy and paste blocks between sites.",
		},
		{
			kind: "update",
			title: "New layout blocks",
			description: "Accordion, popup, and a full site header to build richer pages.",
		},
		{
			kind: "update",
			title: "Icons and brand logos",
			description: "Use brand logos or upload your own icons.",
		},
		{
			kind: "update",
			title: "Motion effects",
			description: "Bring blocks and backgrounds to life with subtle animation.",
		},
		{
			kind: "update",
			title: "Duplicate pages",
			description: "Copy any page and start from there.",
		},
		{
			kind: "update",
			title: "Plugins",
			description: "Add plugins and turn them on or off.",
		},
		{
			kind: "update",
			title: "Post lists open in place",
			description: "Visitors read a post without leaving the page.",
		},
		{
			kind: "improvement",
			title: "Colors everywhere",
			description: "Background, text, gradients, and theme colors on any block.",
		},
		{
			kind: "improvement",
			title: "Cleaner builder",
			description: "Simpler settings and one layout panel for groups, containers, and columns.",
		},
		{
			kind: "improvement",
			title: "Refreshed admin look",
			description: "More consistent controls that are easier to use on phones.",
		},
		{
			kind: "fix",
			title: "Theme names can be edited",
			description: "Typing a theme name or description no longer breaks the theme editor.",
		},
		{
			kind: "fix",
			title: "Live site matches the editor",
			description: "What you design is what gets published.",
		},
		{
			kind: "fix",
			title: "Reliable save and preview",
			description: "Saving, undo, and preview stay in step with your edits.",
		},
		{
			kind: "fix",
			title: "Smoother upgrades",
			description: "Older sites upgrade without getting stuck.",
		},
	] satisfies ReleaseHighlight[],
	supportedUpgradeFrom: ["1.0.12", "1.3.2", "1.3.3", "1.3.4", "1.3.5", "1.3.6", "1.3.7", "1.3.8", "1.3.9", "1.4.0"],
} as const;

export type { ReleaseHighlight, ReleaseHighlightKind } from "./release-highlight-meta";
