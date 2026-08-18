import { NEXTPRESS_CONFIG } from "../../config";
import type { ReleaseHighlight } from "./release-highlight-meta";

/** In-app release notes. Consumer-facing copy only. Keep in sync with package.json on release. */
export const RELEASE_MANIFEST = {
	version: NEXTPRESS_CONFIG.version,
	releaseDate: "2026-08-19",
	highlights: [
		{
			kind: "update",
			title: "Edit text right on the page",
			description:
				"Change headings, paragraphs, quotes, and tables in the canvas without opening the sidebar for every edit.",
		},
		{
			kind: "update",
			title: "Site theme editor",
			description:
				"Set colors, typography, buttons, and icon defaults. Start from presets, or import and export themes as files.",
		},
		{
			kind: "update",
			title: "Quick actions with Cmd+K",
			description:
				"Jump to pages, posts, media, and settings from anywhere in the admin.",
		},
		{
			kind: "update",
			title: "Draft preview while you edit",
			description:
				"Open a live preview of work in progress, including drafts.",
		},
		{
			kind: "fix",
			title: "Lists work the way you expect",
			description:
				"Post titles link to the editor, sorting and pagination are visible, and status can be changed from the list.",
		},
		{
			kind: "fix",
			title: "Preview matches your live site",
			description:
				"The page builder, preview, and published pages use the same layout and block rendering.",
		},
		{
			kind: "fix",
			title: "Post blocks show real content",
			description:
				"Title, excerpt, image, and author blocks reflect your actual post data when published.",
		},
		{
			kind: "fix",
			title: "Block selection is clearer",
			description:
				"Hover and selection outlines no longer stack on nested blocks.",
		},
		{
			kind: "fix",
			title: "No more white flash when you navigate",
			description: "Theme loads before the page paints.",
		},
		{
			kind: "improvement",
			title: "Table or card view for content lists",
			description: "Switch how Posts, Pages, and Media appear.",
		},
		{
			kind: "improvement",
			title: "Reorder posts and pages by drag",
			description: "Sort by menu order, then drag to set the order you want.",
		},
		{
			kind: "improvement",
			title: "Mobile layout check",
			description:
				"See overflow warnings in the builder and apply responsive fixes in one click.",
		},
		{
			kind: "improvement",
			title: "Undo when you delete a block",
			description: "A notification appears with an Undo button.",
		},
	] satisfies ReleaseHighlight[],
	supportedUpgradeFrom: ["1.0.12", "1.3.2", "1.3.3", "1.3.4"],
} as const;

export type { ReleaseHighlight, ReleaseHighlightKind } from "./release-highlight-meta";
