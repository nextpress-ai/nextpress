import { NEXTPRESS_CONFIG } from "../../config";
import type { ReleaseHighlight } from "./release-highlight-meta";

/** In-app release notes. Consumer-facing copy only. Keep in sync with package.json on release. */
export const RELEASE_MANIFEST = {
	version: NEXTPRESS_CONFIG.version,
	releaseDate: "2026-06-21",
	highlights: [
		{
			kind: "update",
			title: "Multiple sites in one install",
			description:
				"Run more than one site from a single NextPress install. Switch sites and keep pages, posts, media, and settings separate for each one.",
		},
		{
			kind: "update",
			title: "Import from WordPress",
			description:
				"Bring published posts and pages from a public WordPress site into NextPress. Import again later to refresh content you already brought over.",
		},
		{
			kind: "improvement",
			title: "More reliable sign-in",
			description:
				"Account sign-in runs on a stronger, more secure foundation. Use the same username and password you already have.",
		},
	] satisfies ReleaseHighlight[],
	supportedUpgradeFrom: ["1.0.12"],
} as const;

export type { ReleaseHighlight, ReleaseHighlightKind } from "./release-highlight-meta";
