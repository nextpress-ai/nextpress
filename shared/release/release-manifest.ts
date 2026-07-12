import { NEXTPRESS_CONFIG } from "../../config";
import type { ReleaseHighlight } from "./release-highlight-meta";

/** In-app release notes. Consumer-facing copy only. Keep in sync with package.json on release. */
export const RELEASE_MANIFEST = {
	version: NEXTPRESS_CONFIG.version,
	releaseDate: "2026-07-12",
	highlights: [
		{
			kind: "update",
			title: "Delete multiple pages or posts at once",
			description:
				"Select items in the Pages or Posts list, then delete them together. A confirmation step runs before anything is removed.",
		},
		{
			kind: "improvement",
			title: "Protected homepage and blog pages",
			description:
				"Your site homepage and blog index pages cannot be deleted by mistake. If a page is tied to a blog with posts, the dashboard explains what to do first.",
		},
		{
			kind: "improvement",
			title: "Fonts load from your site",
			description:
				"Catalog fonts are served from your NextPress install, so published pages stay consistent without relying on an external font service.",
		},
		{
			kind: "improvement",
			title: "Galleries and forms match on publish",
			description:
				"Galleries and form fields look the same in the page builder, in preview, and on your live site.",
		},
		{
			kind: "improvement",
			title: "Browse icons before you search",
			description:
				"The icon picker shows one page of icons at a time so you can explore sets before typing a search term.",
		},
	] satisfies ReleaseHighlight[],
	supportedUpgradeFrom: ["1.0.12", "1.3.2", "1.3.3"],
} as const;

export type { ReleaseHighlight, ReleaseHighlightKind } from "./release-highlight-meta";
