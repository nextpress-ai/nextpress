import type { BlockConfig } from "../types/domain.js";
import { createBlockId } from "../blocks/create-block-id.js";

/** Column layout metadata persisted on `core/columns` (`settings.columnLayout`). */
export type ColumnLayout = {
	columnId: string;
	width?: string;
	blockIds: string[];
};

/** Default columns content — matches dashboard `columns-model.ts` (gap lives on styles). */
export const DEFAULT_COLUMNS_CONTENT = {
	layoutMode: "flex" as const,
	minColumnWidth: "220px",
	verticalAlignment: "top" as const,
	horizontalAlignment: "left" as const,
	direction: "row" as const,
	columnVerticalAlignment: "top" as const,
	columnHorizontalAlignment: "stretch" as const,
};

const getOrderedChildIds = (children: BlockConfig[], layout: ColumnLayout[]): string[] => {
	const childIds = children.map((child) => child.id);
	const assignedIds = new Set(
		layout.flatMap((column) => (Array.isArray(column.blockIds) ? column.blockIds : [])),
	);
	return childIds.filter((id) => assignedIds.has(id)).concat(
		childIds.filter((id) => !assignedIds.has(id)),
	);
};

/**
 * Builds a column layout and redistributes child blocks evenly across columns.
 * @see client/src/components/PageBuilder/blocks/columns/columns-model.ts
 */
export const buildColumnsLayout = (
	count: number,
	children: BlockConfig[],
	previousLayout: ColumnLayout[] = [],
): ColumnLayout[] => {
	const safeCount = Math.max(1, count);
	const width = `${(100 / safeCount).toFixed(2)}%`;
	const orderedChildIds = getOrderedChildIds(children, previousLayout);
	const nextLayout: ColumnLayout[] = Array.from({ length: safeCount }, () => ({
		columnId: `col-${createBlockId()}`,
		width,
		blockIds: [],
	}));

	orderedChildIds.forEach((childId, index) => {
		nextLayout[index % safeCount].blockIds.push(childId);
	});

	return nextLayout;
};

/** Builds columnLayout from explicit column groups (one group per column). */
export const buildColumnsLayoutFromGroups = (groups: BlockConfig[][]): ColumnLayout[] => {
	const safeGroups = groups.length > 0 ? groups : [[]];
	const width = `${(100 / safeGroups.length).toFixed(2)}%`;
	return safeGroups.map((group) => ({
		columnId: `col-${createBlockId()}`,
		width,
		blockIds: group.map((block) => block.id),
	}));
};
