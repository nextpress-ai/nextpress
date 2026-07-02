export type ReleaseHighlightKind = "update" | "fix" | "improvement";

export type ReleaseHighlight = {
	kind: ReleaseHighlightKind;
	title: string;
	description: string;
};
