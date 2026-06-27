export type ReleaseHighlightKind = "update" | "fix" | "improvement";

export type ReleaseHighlight = {
	kind: ReleaseHighlightKind;
	title: string;
	description: string;
};

/** Labels and colors for in-app What's New items (site-owner facing). */
export const RELEASE_HIGHLIGHT_META: Record<
	ReleaseHighlightKind,
	{
		label: string;
		dotClass: string;
		badgeClass: string;
		cardClass: string;
	}
> = {
	update: {
		label: "New feature",
		dotClass: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]",
		badgeClass:
			"bg-orange-500/15 text-orange-900 ring-1 ring-inset ring-orange-500/40 dark:text-orange-100",
		cardClass: "border-l-[3px] border-l-orange-500 bg-orange-500/[0.04]",
	},
	fix: {
		label: "Bug fix",
		dotClass: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]",
		badgeClass:
			"bg-red-500/15 text-red-900 ring-1 ring-inset ring-red-500/40 dark:text-red-100",
		cardClass: "border-l-[3px] border-l-red-500 bg-red-500/[0.04]",
	},
	improvement: {
		label: "Improvement",
		dotClass: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]",
		badgeClass:
			"bg-blue-500/15 text-blue-900 ring-1 ring-inset ring-blue-500/40 dark:text-blue-100",
		cardClass: "border-l-[3px] border-l-blue-500 bg-blue-500/[0.04]",
	},
};
