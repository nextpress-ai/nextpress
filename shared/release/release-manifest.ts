import { NEXTPRESS_CONFIG } from "../../config";
import type { ReleaseHighlight } from "./release-highlight-meta";

/** In-app release notes. Consumer-facing copy only. Keep in sync with package.json on release. */
export const RELEASE_MANIFEST = {
	version: NEXTPRESS_CONFIG.version,
	releaseDate: "2026-10-02",
	highlights: [
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
