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
 * Vertical gap between top-level page blocks. Shared by preview, publish, and the
 * editor canvas so dense layouts breathe consistently (flex `gap`, not per-block margin).
 */
export const PAGE_BLOCK_STACK_GAP = "1.5rem";

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

/** True when vertical sibling placement needs room along the parent main/cross axis. */
export function blockHasVerticalPlacement(
	rawStyles: CSSProperties | undefined,
): boolean {
	const { v } = readPlacement(rawStyles);
	return v === "middle" || v === "bottom";
}

export function stackNeedsVerticalPlacementRoom(
	children: { styles?: CSSProperties }[] | undefined,
): boolean {
	if (!children?.length) return false;
	return children.some((child) => blockHasVerticalPlacement(child.styles));
}

/** Height constraints from the container shell — applied on the outer wrapper only. */
export function getContainerShellSizingStyles(
	styles: CSSProperties | undefined,
): CSSProperties {
	if (!styles) return {};
	const out: CSSProperties = {};
	const minHeight = styles.minHeight;
	const height = styles.height;
	if (minHeight != null && minHeight !== "" && minHeight !== "auto") {
		out.minHeight = minHeight;
	}
	if (height != null && height !== "" && height !== "auto") {
		out.height = height;
	}
	return out;
}

export function hasContainerShellSizing(styles: CSSProperties | undefined): boolean {
	const shell = getContainerShellSizingStyles(styles);
	return Boolean(shell.minHeight || shell.height);
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
			out.marginBottom = 0;
		} else if (v === "top") {
			out.marginTop = 0;
			out.marginBottom = "auto";
		}

		return out;
	}

	// Row — main horizontal; vertical is cross-axis and needs stretch + inner flex when container has height.
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

	if (v === "middle" || v === "bottom" || v === "top") {
		out.alignSelf = "stretch";
		out.display = "flex";
		out.flexDirection = "column";
		out.minHeight = "100%";
		out.height = "100%";
		out.justifyContent =
			v === "middle" ? "center" : v === "bottom" ? "flex-end" : "flex-start";
	} else if (!h) {
		out.alignSelf = "stretch";
	} else {
		out.alignSelf = "stretch";
	}

	return out;
}

/**
 * When `other.stackLayer` is set, siblings inside a layout container can overlap with predictable paint order
 * (higher values render above). Requires `position: relative` on the flex/grid item wrapper.
 */
export function getBlockStackLayerWrapperStyles(block: {
	other?: { stackLayer?: number | null };
}): CSSProperties {
	const raw = block.other?.stackLayer;
	if (raw === undefined || raw === null) return {};
	const z = typeof raw === "number" && Number.isFinite(raw) ? Math.trunc(raw) : 0;
	return { position: "relative", zIndex: z };
}

/** Layout controls for container/group blocks (Style tab → `styles`; group may also use `content`). */
export type ContainerLayoutDisplay =
	| "block"
	| "flex"
	| "inline-flex"
	| "grid"
	| "inline"
	| "inline-block";

export type ContainerLayoutRead = {
	display: ContainerLayoutDisplay;
	flexDirection: "row" | "column" | "row-reverse" | "column-reverse";
	flexWrap: string;
	alignItems: string;
	justifyContent: string;
	gap?: string;
	gridTemplateColumns?: string;
};

const CONTAINER_CHILDREN_STACK_STYLE_KEYS = [
	"display",
	"flexDirection",
	"flexWrap",
	"alignItems",
	"justifyContent",
	"gap",
	"gridTemplateColumns",
] as const;

type LayoutSource = {
	styles?: CSSProperties;
	content?: Record<string, unknown> | null;
};

function pickLayoutValue(
	styles: Record<string, unknown> | undefined,
	content: Record<string, unknown> | undefined,
	key: string,
): string | undefined {
	const fromStyles = styles?.[key];
	if (fromStyles !== undefined && fromStyles !== null && fromStyles !== "") {
		return String(fromStyles);
	}
	const fromContent = content?.[key];
	if (fromContent !== undefined && fromContent !== null && fromContent !== "") {
		return String(fromContent);
	}
	return undefined;
}

function readLayoutContentRecord(content: LayoutSource["content"]): Record<string, unknown> {
	if (!content || typeof content !== "object") return {};
	if ("kind" in content) return {};
	return content;
}

/**
 * Reads flex/grid layout for container and group blocks.
 * Style-tab controls persist on `styles`; legacy group presets may use `content`.
 */
export function readContainerLayoutFromBlock(block: LayoutSource): ContainerLayoutRead {
	const styles = block.styles as Record<string, unknown> | undefined;
	const content = readLayoutContentRecord(block.content);
	const displayRaw = pickLayoutValue(styles, content, "display") ?? "block";
	const display = (
		["block", "flex", "inline-flex", "grid", "inline", "inline-block"] as const
	).includes(displayRaw as ContainerLayoutDisplay)
		? (displayRaw as ContainerLayoutDisplay)
		: "block";

	const flexDirectionRaw =
		pickLayoutValue(styles, content, "flexDirection") ?? "column";
	const flexDirection = (
		["row", "column", "row-reverse", "column-reverse"] as const
	).includes(flexDirectionRaw as ContainerLayoutRead["flexDirection"])
		? (flexDirectionRaw as ContainerLayoutRead["flexDirection"])
		: "column";

	return {
		display,
		flexDirection,
		flexWrap: pickLayoutValue(styles, content, "flexWrap") ?? "nowrap",
		alignItems: pickLayoutValue(styles, content, "alignItems") ?? "flex-start",
		justifyContent: pickLayoutValue(styles, content, "justifyContent") ?? "flex-start",
		gap: pickLayoutValue(styles, content, "gap"),
		gridTemplateColumns: pickLayoutValue(styles, content, "gridTemplateColumns"),
	};
}

/** Normalized parent display for sibling placement axis mapping. */
export function getContainerParentDisplayMode(
	layout: ContainerLayoutRead,
): "flex" | "grid" | "block" {
	if (layout.display === "flex" || layout.display === "inline-flex") return "flex";
	if (layout.display === "grid") return "grid";
	return "block";
}

/** Stack direction for child `contentAlign*` placement inside this container. */
export function getContainerSiblingStackDirection(layout: ContainerLayoutRead): BlockStackDirection {
	const mode = getContainerParentDisplayMode(layout);
	if (mode === "flex" && (layout.flexDirection === "row" || layout.flexDirection === "row-reverse")) {
		return "row";
	}
	return "column";
}

/**
 * Flex/grid styles for the element that directly wraps container children.
 * Must be the only flex parent — do not nest another flex wrapper inside.
 */
export function getContainerChildrenStackStyle(
	layout: ContainerLayoutRead,
	options?: {
		shellStyles?: CSSProperties;
		children?: { styles?: CSSProperties }[];
	},
): CSSProperties {
	const parentDisplay = getContainerParentDisplayMode(layout);
	const isHorizontal = parentDisplay === "flex" && layout.flexDirection === "row";

	const childOuterDisplay =
		parentDisplay === "flex" ? "flex" : parentDisplay === "grid" ? "grid" : "flex";

	const siblingFlexDirection: CSSProperties["flexDirection"] =
		parentDisplay === "flex"
			? layout.flexDirection
			: "column";

	const needsVerticalRoom = stackNeedsVerticalPlacementRoom(options?.children);
	const shouldFillShell =
		hasContainerShellSizing(options?.shellStyles) || needsVerticalRoom;

	const out: CSSProperties = {
		display: childOuterDisplay,
		width: "100%",
		minWidth: 0,
	};

	if (shouldFillShell) {
		out.flex = 1;
		out.minHeight = 0;
		out.alignSelf = "stretch";
	}

	if (layout.gap && parentDisplay !== "block") {
		out.gap = layout.gap;
	}

	if (childOuterDisplay === "flex") {
		out.flexDirection = siblingFlexDirection;
		out.flexWrap = (
			parentDisplay === "flex" ? layout.flexWrap : undefined
		) as CSSProperties["flexWrap"] | undefined;
		out.alignItems = layout.alignItems;
		out.justifyContent = layout.justifyContent;
	}

	if (childOuterDisplay === "grid") {
		out.gridTemplateColumns =
			layout.gridTemplateColumns || "repeat(auto-fill, minmax(200px, 1fr))";
		out.alignItems = layout.alignItems;
		out.justifyContent = layout.justifyContent;
	}

	if (parentDisplay === "flex" && isHorizontal && needsVerticalRoom) {
		out.alignItems = "stretch";
	}

	return out;
}

/**
 * Outer container shell: owns height/minHeight and becomes a flex column so the inner
 * children stack can flex-fill the content box (required for vertical sibling placement).
 */
export function getContainerOuterShellStyle(
	styles: CSSProperties | undefined,
	options?: { children?: { styles?: CSSProperties }[] },
): CSSProperties {
	const stripped = stripContainerLayoutFromOuterStyles(styles);
	const shellSizing = getContainerShellSizingStyles(styles);
	const needsVerticalRoom = stackNeedsVerticalPlacementRoom(options?.children);

	const resolvedSizing: CSSProperties = { ...shellSizing };
	if (needsVerticalRoom && !resolvedSizing.minHeight && !resolvedSizing.height) {
		resolvedSizing.minHeight = "8rem";
	}

	const needsFlexShell = hasContainerShellSizing(styles) || needsVerticalRoom;
	if (!needsFlexShell) {
		return {
			...stripped,
			width: stripped.width ?? "100%",
			maxWidth: stripped.maxWidth ?? "100%",
			boxSizing: "border-box",
		};
	}

	const {
		minHeight: _minHeight,
		height: _height,
		...restStripped
	} = stripped as CSSProperties & { minHeight?: string; height?: string };

	return {
		...restStripped,
		...resolvedSizing,
		width: restStripped.width ?? "100%",
		maxWidth: restStripped.maxWidth ?? "100%",
		display: "flex",
		flexDirection: "column",
		boxSizing: "border-box",
	};
}

/** Removes layout keys applied on the children stack so they are not duplicated on the outer shell. */
export function stripContainerLayoutFromOuterStyles(
	styles: CSSProperties | undefined,
): CSSProperties {
	if (!styles) return {};
	const out = { ...styles } as Record<string, unknown>;
	for (const key of CONTAINER_CHILDREN_STACK_STYLE_KEYS) {
		delete out[key];
	}
	return out as CSSProperties;
}
