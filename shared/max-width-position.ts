import type { CSSProperties } from "react";

export type MaxWidthPosition = "left" | "center" | "right";

export const MAX_WIDTH_POSITION_OPTIONS: readonly { value: MaxWidthPosition; label: string }[] = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
] as const;

type Styles = CSSProperties | Record<string, unknown> | undefined;

const read = (styles: Styles, key: string): string => String((styles as Record<string, unknown> | undefined)?.[key] ?? "").trim();

/** True when a block has a real max width, so a position inside its parent means something. */
export function hasCappedWidth(styles: Styles): boolean {
	const maxWidth = read(styles, "maxWidth");
	return maxWidth !== "" && maxWidth !== "100%" && maxWidth !== "none";
}

/** Where a max-width block sits, read from its auto side margins; null = not chosen (follows the parent). */
export function readMaxWidthPosition(styles: Styles): MaxWidthPosition | null {
	const left = read(styles, "marginLeft") === "auto";
	const right = read(styles, "marginRight") === "auto";
	if (left && right) return "center";
	if (left) return "right";
	if (right) return "left";
	return null;
}

/**
 * Styles for "max width, sitting left/centre/right": fill the space up to the max width and push
 * with auto margins. `null` clears a margin (the style merge skips `undefined`). A fixed width is
 * left alone; only unset or 100% becomes an explicit fill, which the layout keeps when a parent
 * centres its children.
 */
export function maxWidthPositionStyles({
	position,
	styles,
}: {
	position: MaxWidthPosition;
	styles: Styles;
}): Record<string, string | null> {
	const width = read(styles, "width");
	return {
		...(width === "" || width === "100%" ? { width: "100%" } : {}),
		marginLeft: position === "left" ? null : "auto",
		marginRight: position === "right" ? null : "auto",
	};
}
