import type { CSSProperties } from "react";
import type { BlockContent } from "@shared/schema-types";
import { buildFlexRowColumnStyle } from "@shared/columns-flex-style";

/**
 * Column layout metadata persisted on container blocks (`settings.columnLayout`).
 */
export interface ColumnLayout {
	columnId: string;
	width?: string;
	blockIds: string[];
}

/**
 * Serialized columns block layout options (`content.kind === "structured"`).
 */
export interface ColumnsData extends Record<string, unknown> {
	layoutMode?: "flex" | "grid";
	gap?: string;
	minColumnWidth?: string;
	verticalAlignment?: "top" | "center" | "bottom" | "stretch";
	horizontalAlignment?: "left" | "center" | "right" | "space-between" | "space-around";
	direction?: "row" | "column";
	columnVerticalAlignment?: "top" | "center" | "bottom" | "stretch";
	columnHorizontalAlignment?: "left" | "center" | "right" | "stretch";
}

export type ColumnsContent = BlockContent & {
	data?: ColumnsData;
};

/** Parses columns layout settings from block content (structured or legacy). */
export function readColumnsData(content: BlockContent): ColumnsData {
	if (!content) return {};
	if (typeof content === "object" && "kind" in content) {
		if (content.kind === "structured" && content.data && typeof content.data === "object") {
			const data = content.data as Record<string, unknown>;
			return {
				layoutMode: typeof data.layoutMode === "string" ? (data.layoutMode as ColumnsData["layoutMode"]) : undefined,
				gap: typeof data.gap === "string" ? data.gap : undefined,
				minColumnWidth: typeof data.minColumnWidth === "string" ? data.minColumnWidth : undefined,
				verticalAlignment: typeof data.verticalAlignment === "string"
					? (data.verticalAlignment as ColumnsData["verticalAlignment"])
					: undefined,
				horizontalAlignment: typeof data.horizontalAlignment === "string"
					? (data.horizontalAlignment as ColumnsData["horizontalAlignment"])
					: undefined,
				direction: typeof data.direction === "string" ? (data.direction as ColumnsData["direction"]) : undefined,
				columnVerticalAlignment: typeof data.columnVerticalAlignment === "string"
					? (data.columnVerticalAlignment as ColumnsData["columnVerticalAlignment"])
					: undefined,
				columnHorizontalAlignment: typeof data.columnHorizontalAlignment === "string"
					? (data.columnHorizontalAlignment as ColumnsData["columnHorizontalAlignment"])
					: undefined,
			};
		}
		return {};
	}
	const legacy = content as unknown as Record<string, unknown>;
	return {
		layoutMode: typeof legacy.layoutMode === "string" ? (legacy.layoutMode as ColumnsData["layoutMode"]) : undefined,
		gap: typeof legacy.gap === "string" ? legacy.gap : undefined,
		minColumnWidth: typeof legacy.minColumnWidth === "string" ? legacy.minColumnWidth : undefined,
		verticalAlignment: typeof legacy.verticalAlignment === "string"
			? (legacy.verticalAlignment as ColumnsData["verticalAlignment"])
			: undefined,
		horizontalAlignment: typeof legacy.horizontalAlignment === "string"
			? (legacy.horizontalAlignment as ColumnsData["horizontalAlignment"])
			: undefined,
		direction: typeof legacy.direction === "string" ? (legacy.direction as ColumnsData["direction"]) : undefined,
		columnVerticalAlignment: typeof legacy.columnVerticalAlignment === "string"
			? (legacy.columnVerticalAlignment as ColumnsData["columnVerticalAlignment"])
			: undefined,
		columnHorizontalAlignment: typeof legacy.columnHorizontalAlignment === "string"
			? (legacy.columnHorizontalAlignment as ColumnsData["columnHorizontalAlignment"])
			: undefined,
	};
}

export function writeColumnsData(prev: BlockContent, updates: Partial<ColumnsData>): BlockContent {
	const current = readColumnsData(prev);
	const next: ColumnsData = { ...current, ...updates };
	return { kind: "structured", data: next as Record<string, unknown> };
}

/**
 * Computes the outer container style for the Columns block (matches editor).
 */
export function buildColumnsContainerStyle(
	data: ColumnsData,
	layout: ColumnLayout[],
	styles?: CSSProperties,
): CSSProperties {
	const gap = data.gap || "20px";
	const minColumnWidth = data.minColumnWidth || "220px";
	const verticalAlignment = data.verticalAlignment || "top";
	const horizontalAlignment = data.horizontalAlignment || "left";
	const direction = data.direction || "row";
	const layoutMode = data.layoutMode || "flex";

	const alignItems = {
		top: "flex-start",
		center: "center",
		bottom: "flex-end",
		stretch: "stretch",
	}[verticalAlignment];

	const justifyContent = {
		left: "flex-start",
		center: "center",
		right: "flex-end",
		"space-between": "space-between",
		"space-around": "space-around",
	}[horizontalAlignment];

	if (layoutMode === "grid") {
		const isVertical = direction === "column";
		return {
			...styles,
			display: "grid",
			gap,
			width: "100%",
			gridTemplateColumns: isVertical
				? "minmax(0, 1fr)"
				: `repeat(${Math.max(layout.length, 1)}, minmax(0, 1fr))`,
			gridTemplateRows: isVertical
				? `repeat(${Math.max(layout.length, 1)}, auto)`
				: undefined,
			alignItems,
			justifyItems:
				justifyContent === "flex-start"
					? "start"
					: justifyContent === "flex-end"
						? "end"
						: justifyContent === "center"
							? "center"
							: "stretch",
		};
	}

	return {
		...styles,
		display: "flex",
		flexDirection: direction,
		flexWrap: direction === "row" ? "wrap" : "nowrap",
		gap,
		width: "100%",
		maxWidth: "100%",
		alignItems,
		justifyContent,
		...(direction === "row"
			? {
					alignContent: "stretch",
					["--np-columns-min-width" as string]: minColumnWidth,
				}
			: {}),
	};
}

export function buildColumnStyle(
	data: ColumnsData,
	layoutMode: NonNullable<ColumnsData["layoutMode"]>,
	direction: NonNullable<ColumnsData["direction"]>,
	column: ColumnLayout,
	layout: ColumnLayout[],
): CSSProperties {
	if (layoutMode === "grid") {
		return {
			minWidth: 0,
			width: "100%",
		};
	}

	if (direction === "column") {
		return {
			minWidth: 0,
			width: "100%",
		};
	}

	const gap = data.gap?.trim() || "20px";
	const columnCount = Math.max(1, layout.length);

	return buildFlexRowColumnStyle(column.width, data.minColumnWidth, {
		gap,
		columnCount,
	}) as CSSProperties;
}

type ColumnLayoutBlock = {
	settings?: Record<string, unknown>;
	content?: BlockContent;
	children?: { id: string }[];
};

/**
 * Assigns unmapped children to the first column so public/preview render matches the editor.
 */
export function normalizeColumnLayoutWithChildren(
	layout: ColumnLayout[],
	children: { id: string }[],
): ColumnLayout[] {
	const assigned = new Set(layout.flatMap((col) => col.blockIds ?? []));
	const orphans = children.filter((child) => !assigned.has(child.id)).map((child) => child.id);
	if (orphans.length === 0) {
		return layout;
	}

	const [first, ...rest] = layout;
	if (!first) {
		return [{ columnId: "default-col-1", width: "100%", blockIds: orphans }];
	}

	return [{ ...first, blockIds: [...(first.blockIds ?? []), ...orphans] }, ...rest];
}

/**
 * Reads column layout from block settings (canonical), with legacy content fallback.
 * Defaults to a single full-width column containing all children.
 */
export function readColumnLayoutFromBlock(block: ColumnLayoutBlock): ColumnLayout[] {
	const fromSettings = block.settings?.columnLayout;
	if (Array.isArray(fromSettings) && fromSettings.length > 0) {
		return normalizeColumnLayoutWithChildren(fromSettings as ColumnLayout[], block.children ?? []);
	}

	const data = readColumnsData(block.content ?? {});
	const fromContent = (data as { columnLayout?: ColumnLayout[] }).columnLayout;
	if (Array.isArray(fromContent) && fromContent.length > 0) {
		return normalizeColumnLayoutWithChildren(fromContent, block.children ?? []);
	}

	const childIds = (block.children ?? []).map((child) => child.id);
	return [{ columnId: "default-col-1", width: "100%", blockIds: childIds }];
}
