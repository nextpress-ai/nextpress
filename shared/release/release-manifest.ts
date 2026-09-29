import { NEXTPRESS_CONFIG } from "../../config";
import type { ReleaseHighlight } from "./release-highlight-meta";

/** In-app release notes. Consumer-facing copy only. Keep in sync with package.json on release. */
export const RELEASE_MANIFEST = {
	version: NEXTPRESS_CONFIG.version,
	releaseDate: "2026-09-29",
	highlights: [
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
	supportedUpgradeFrom: ["1.0.12", "1.3.2", "1.3.3", "1.3.4", "1.3.5", "1.3.6", "1.3.7"],
} as const;

export type { ReleaseHighlight, ReleaseHighlightKind } from "./release-highlight-meta";
