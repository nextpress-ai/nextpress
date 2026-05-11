import type { CSSProperties } from "react";

/**
 * Horizontal placement of this block relative to sibling stacking in flex layouts.
 */
export type BlockContentAlignHorizontal = "left" | "center" | "right";

/**
 * Vertical placement of this block relative to sibling stacking / free space along main axis (column stacks).
 */
export type BlockContentAlignVertical = "top" | "middle" | "bottom";

/** Direction in which sibling blocks stack inside the immediate parent layout (flex/grid). */
export type BlockStackDirection = "row" | "column";

/** Custom keys persisted on block.styles — stripped before passing styles to DOM. */
export const BLOCK_CONTAINER_PLACEMENT_KEYS = [
	"contentAlignHorizontal",
	"contentAlignVertical",
] as const;

/**
 * Removes editor-only placement controls from persisted inline styles before DOM use.
 */
export function stripBlockContainerPlacementStyles(styles: CSSProperties | undefined): CSSProperties {
	if (!styles) return {};
	const { contentAlignHorizontal, contentAlignVertical, ...rest } = styles as Record<string, unknown>;
	return rest as CSSProperties;
}

function readPlacement(raw: CSSProperties | undefined): {
	h?: BlockContentAlignHorizontal;
	v?: BlockContentAlignVertical;
} {
	if (!raw) return {};
	const h = (raw as Record<string, unknown>).contentAlignHorizontal as unknown;
	const v = (raw as Record<string, unknown>).contentAlignVertical as unknown;
	return {
		h: h === "left" || h === "center" || h === "right" ? h : undefined,
		v: v === "top" || v === "middle" || v === "bottom" ? v : undefined,
	};
}

/** True when a non-default horizontal or vertical sibling placement is active (ignores `null` clears). */
export function hasBlockContainerPlacement(raw: CSSProperties | undefined): boolean {
	const { h, v } = readPlacement(raw);
	return !!(h || v);
}

/**
 * Inline styles for the flex/grid **item wrapper** placed around each sibling block so
 * horizontal (left/center/right) and vertical (top/middle/bottom) work inside the parent.
 *
 * Parents must lay out siblings with CSS flex (recommended) so `align-self` / margin:auto apply.
 *
 * Axis mapping:
 * - `stackDirection: 'column'` — main axis vertical; cross horizontal → `alignSelf` for horizontal, margin auto on main axis for vertical.
 * - `stackDirection: 'row'` — main axis horizontal; cross vertical → margins for horizontal positioning, `alignSelf` for vertical.
 *
 * Persisted clears use `null` (see `deepMerge` in treeUtils — `undefined` is skipped).
 */
export function getBlockSiblingFlexItemStyles(
	rawStyles: CSSProperties | undefined,
	stackDirection: BlockStackDirection,
): CSSProperties {
	const { h, v } = readPlacement(rawStyles);
	if (!h && !v) return { minWidth: 0 };

	const out: CSSProperties = {
		minWidth: 0,
	};

	if (stackDirection === "column") {
		if (h === "center") {
			out.alignSelf = "center";
			out.width = "auto";
			out.maxWidth = "100%";
		} else if (h === "right") {
			out.alignSelf = "flex-end";
			out.width = "auto";
			out.maxWidth = "100%";
		} else if (h === "left") {
			out.alignSelf = "stretch";
		}

		if (v === "middle") {
			out.marginTop = "auto";
			out.marginBottom = "auto";
		} else if (v === "bottom") {
			out.marginTop = "auto";
		}

		return out;
	}

	// Row — main horizontal
	if (h === "center") {
		out.marginLeft = "auto";
		out.marginRight = "auto";
		out.width = "auto";
		out.maxWidth = "100%";
	} else if (h === "right") {
		out.marginLeft = "auto";
		out.marginRight = undefined;
		out.width = "auto";
		out.maxWidth = "100%";
	} else if (h === "left") {
		out.marginRight = "auto";
		out.marginLeft = undefined;
	}

	if (v === "middle") {
		out.alignSelf = "center";
	} else if (v === "bottom") {
		out.alignSelf = "flex-end";
	} else {
		out.alignSelf = "stretch";
	}

	return out;
}
