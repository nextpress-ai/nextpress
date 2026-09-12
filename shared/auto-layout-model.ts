import type { CSSProperties } from "react";
import { SPACING_PRESETS } from "./dimension-presets";
import {
	getContainerParentDisplayMode,
	readContainerLayoutFromBlock,
} from "./block-container-placement";

/** Packed vs space-along-main-axis (Figma Auto Layout distribution). */
export type AutoLayoutDistribution =
	| "packed"
	| "space-between"
	| "space-around"
	| "space-evenly";

export type AutoLayoutAlignPoint =
	| "top-left"
	| "top-center"
	| "top-right"
	| "middle-left"
	| "middle-center"
	| "middle-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export type AutoLayoutResize = "hug" | "fill" | "fixed";

export const AUTO_LAYOUT_ALIGN_POINTS: readonly {
	value: AutoLayoutAlignPoint;
	label: string;
	row: "top" | "middle" | "bottom";
	col: "left" | "center" | "right";
}[] = [
	{ value: "top-left", label: "Align top left", row: "top", col: "left" },
	{ value: "top-center", label: "Align top center", row: "top", col: "center" },
	{ value: "top-right", label: "Align top right", row: "top", col: "right" },
	{ value: "middle-left", label: "Align middle left", row: "middle", col: "left" },
	{ value: "middle-center", label: "Align middle center", row: "middle", col: "center" },
	{ value: "middle-right", label: "Align middle right", row: "middle", col: "right" },
	{ value: "bottom-left", label: "Align bottom left", row: "bottom", col: "left" },
	{ value: "bottom-center", label: "Align bottom center", row: "bottom", col: "center" },
	{ value: "bottom-right", label: "Align bottom right", row: "bottom", col: "right" },
] as const;

const AXIS_START = "flex-start";
const AXIS_CENTER = "center";
const AXIS_END = "flex-end";

function rowToMain(row: "top" | "middle" | "bottom"): string {
	if (row === "middle") return AXIS_CENTER;
	if (row === "bottom") return AXIS_END;
	return AXIS_START;
}

function colToMain(col: "left" | "center" | "right"): string {
	if (col === "center") return AXIS_CENTER;
	if (col === "right") return AXIS_END;
	return AXIS_START;
}

function rowToCross(row: "top" | "middle" | "bottom"): string {
	return rowToMain(row);
}

function colToCross(col: "left" | "center" | "right"): string {
	return colToMain(col);
}

/** Maps a 9-point cell to justify/align for a column (vertical) or row (horizontal) stack. */
export function alignPointToFlexStyles(
	point: AutoLayoutAlignPoint,
	stackIsRow: boolean,
): { justifyContent: string; alignItems: string } {
	const meta = AUTO_LAYOUT_ALIGN_POINTS.find((item) => item.value === point);
	const row = meta?.row ?? "top";
	const col = meta?.col ?? "left";
	if (stackIsRow) {
		return { justifyContent: colToMain(col), alignItems: rowToCross(row) };
	}
	return { justifyContent: rowToMain(row), alignItems: colToCross(col) };
}

/** Reverse of alignPointToFlexStyles — nearest 9-point cell for current CSS. */
export function flexStylesToAlignPoint(
	justifyContent: string | undefined,
	alignItems: string | undefined,
	stackIsRow: boolean,
): AutoLayoutAlignPoint {
	const justify = justifyContent || AXIS_START;
	const align = alignItems || AXIS_START;
	const mainIsStart = justify === AXIS_START || justify === "start";
	const mainIsCenter = justify === AXIS_CENTER;
	const mainIsEnd = justify === AXIS_END || justify === "end";
	const crossIsStart = align === AXIS_START || align === "start";
	const crossIsCenter = align === AXIS_CENTER;
	const crossIsEnd = align === AXIS_END || align === "end";

	const main: "start" | "center" | "end" = mainIsCenter
		? "center"
		: mainIsEnd
			? "end"
			: mainIsStart
				? "start"
				: "start";
	const cross: "start" | "center" | "end" = crossIsCenter
		? "center"
		: crossIsEnd
			? "end"
			: crossIsStart
				? "start"
				: "start";

	if (stackIsRow) {
		const col = main === "center" ? "center" : main === "end" ? "right" : "left";
		const row = cross === "center" ? "middle" : cross === "end" ? "bottom" : "top";
		return `${row}-${col}` as AutoLayoutAlignPoint;
	}
	const row = main === "center" ? "middle" : main === "end" ? "bottom" : "top";
	const col = cross === "center" ? "center" : cross === "end" ? "right" : "left";
	return `${row}-${col}` as AutoLayoutAlignPoint;
}

export function readDistribution(justifyContent: string | undefined): AutoLayoutDistribution {
	if (justifyContent === "space-between") return "space-between";
	if (justifyContent === "space-around") return "space-around";
	if (justifyContent === "space-evenly") return "space-evenly";
	return "packed";
}

export function distributionToJustify(
	distribution: AutoLayoutDistribution,
	packedJustify: string,
): string {
	if (distribution === "packed") return packedJustify;
	return distribution;
}

function isHugKeyword(value: string): boolean {
	return (
		value === "fit-content" ||
		value === "max-content" ||
		value === "min-content" ||
		value === "auto"
	);
}

/** Hug / Fill / Fixed from a CSS width (unset and 100% are Fill so old row children still grow). */
export function readResizeFromLength(width: unknown): AutoLayoutResize {
	const w = width == null || width === "" ? "" : String(width).trim();
	if (isHugKeyword(w)) return "hug";
	if (w === "" || w === "100%") return "fill";
	return "fixed";
}

/**
 * Height unset is Hug (stack sizes to content). 100% is Fill.
 * Hug writes `"auto"` so deepMerge actually replaces a previous length.
 */
export function readResizeFromHeight(height: unknown): AutoLayoutResize {
	const h = height == null || height === "" ? "" : String(height).trim();
	if (h === "" || isHugKeyword(h)) return "hug";
	if (h === "100%") return "fill";
	return "fixed";
}

export function resizeToWidth(
	resize: AutoLayoutResize,
	currentWidth: unknown,
): string | undefined {
	if (resize === "hug") return "fit-content";
	if (resize === "fill") return "100%";
	const current = currentWidth == null ? "" : String(currentWidth).trim();
	if (current && readResizeFromLength(current) === "fixed") return current;
	return "320px";
}

export function resizeToHeight(
	resize: AutoLayoutResize,
	currentHeight: unknown,
): string {
	if (resize === "hug") return "auto";
	if (resize === "fill") return "100%";
	const current = currentHeight == null ? "" : String(currentHeight).trim();
	if (current && readResizeFromHeight(current) === "fixed") return current;
	return "240px";
}

export const AUTO_LAYOUT_GAP_PRESETS = SPACING_PRESETS;

export const GRID_TRACK_STARTERS: readonly { value: string; label: string }[] = [
	{ value: "repeat(2, 1fr)", label: "2 col" },
	{ value: "repeat(3, 1fr)", label: "3 col" },
	{ value: "repeat(auto-fit, minmax(220px, 1fr))", label: "RAM" },
	{ value: "repeat(auto-fill, minmax(200px, 1fr))", label: "Auto fill" },
	{ value: "250px 1fr", label: "Sidebar L" },
	{ value: "1fr 250px", label: "Sidebar R" },
] as const;

export const FLEX_STARTER_STYLES = {
	column: {
		display: "flex",
		flexDirection: "column",
		flexWrap: "nowrap",
		gap: "1rem",
		alignItems: "flex-start",
		justifyContent: "flex-start",
	} satisfies CSSProperties,
	row: {
		display: "flex",
		flexDirection: "row",
		flexWrap: "wrap",
		gap: "1rem",
		alignItems: "center",
		justifyContent: "flex-start",
	} satisfies CSSProperties,
	grid2: {
		display: "grid",
		gridTemplateColumns: "repeat(2, 1fr)",
		gap: "1rem",
	} satisfies CSSProperties,
	grid3: {
		display: "grid",
		gridTemplateColumns: "repeat(3, 1fr)",
		gap: "1rem",
	} satisfies CSSProperties,
} as const;

export type FlexStarterKey = keyof typeof FLEX_STARTER_STYLES;

/** True when live styles still match a Content-tab starter (preset label alone can lie). */
export function matchFlexStarterKey(
	styles?: CSSProperties | Record<string, unknown>,
): FlexStarterKey | "" {
	const current = (styles ?? {}) as Record<string, unknown>;
	for (const key of Object.keys(FLEX_STARTER_STYLES) as FlexStarterKey[]) {
		const starter = FLEX_STARTER_STYLES[key];
		const matches = Object.entries(starter).every(([prop, expected]) => {
			const raw = current[prop];
			const value = raw == null || raw === "" ? "" : String(raw).trim();
			return value === String(expected);
		});
		if (matches) return key;
	}
	return "";
}

/** Pin card is only meaningful inside a stacking parent. */
export function parentAllowsChildPin(
	parent:
		| {
				name?: string;
				styles?: CSSProperties;
				content?: unknown;
		  }
		| null
		| undefined,
): boolean {
	if (!parent) return false;
	if (parent.name === "core/columns") return true;
	if (parent.name === "core/stack") return true;
	const layout = readContainerLayoutFromBlock({
		styles: parent.styles,
		content: parent.content as Record<string, unknown>,
	});
	return getContainerParentDisplayMode(layout) !== "block";
}
