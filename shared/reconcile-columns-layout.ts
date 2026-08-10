import type { ColumnLayout } from "./columns-layout";
import type { BlockConfig } from "./schema-types";

type ColumnsSettings = {
	columnLayout?: ColumnLayout[];
};

export type ColumnsReconciliationIssueCode =
	| "MISSING_COLUMN_LAYOUT"
	| "STALE_BLOCK_REFERENCE"
	| "DUPLICATE_BLOCK_MEMBERSHIP"
	| "ORPHAN_CHILD";

export type ColumnsReconciliationIssue = {
	code: ColumnsReconciliationIssueCode;
	columnsBlockId: string;
	blockId?: string;
	columnId?: string;
	keptColumnId?: string;
};

export type ColumnsReconciliationResult = {
	blocks: BlockConfig[];
	issues: ColumnsReconciliationIssue[];
	changed: boolean;
};

type ReconciledBlock = {
	block: BlockConfig;
	changed: boolean;
};

const DEFAULT_COLUMN: ColumnLayout = {
	columnId: "default-col-1",
	width: "100%",
	blockIds: [],
};

type SanitizedColumnLayout = {
	column: ColumnLayout;
	malformed: boolean;
};

const sanitizeColumnLayout = (column: ColumnLayout): SanitizedColumnLayout | null => {
	if (!column || typeof column !== "object" || typeof column.columnId !== "string") {
		return null;
	}

	if (!Array.isArray(column.blockIds)) {
		return {
			column: { ...column, blockIds: [] },
			malformed: true,
		};
	}

	const blockIds = column.blockIds.filter((blockId) => typeof blockId === "string");
	return {
		column: { ...column, blockIds },
		malformed: blockIds.length !== column.blockIds.length,
	};
};

type ReadColumnLayoutResult = {
	layout: ColumnLayout[] | null;
	malformed: boolean;
};

const readColumnLayout = (block: BlockConfig): ReadColumnLayoutResult => {
	const settings = block.settings as ColumnsSettings | undefined;
	const rawLayout = settings?.columnLayout;
	if (!Array.isArray(rawLayout) || rawLayout.length === 0) {
		return { layout: null, malformed: false };
	}

	let malformed = false;
	const layout = rawLayout.flatMap((column) => {
		const sanitized = sanitizeColumnLayout(column);
		if (!sanitized) {
			malformed = true;
			return [];
		}
		malformed ||= sanitized.malformed;
		return [sanitized.column];
	});

	return {
		layout: layout.length > 0 ? layout : null,
		malformed: malformed || layout.length !== rawLayout.length,
	};
};

const areStringArraysEqual = ({
	left,
	right,
}: {
	left: string[];
	right: string[];
}): boolean =>
	left.length === right.length && left.every((value, index) => value === right[index]);

const areLayoutsEqual = ({
	left,
	right,
}: {
	left: ColumnLayout[] | null;
	right: ColumnLayout[];
}): boolean =>
	left !== null &&
	left.length === right.length &&
	left.every((column, index) => {
		const nextColumn = right[index];
		return (
			nextColumn !== undefined &&
			column.columnId === nextColumn.columnId &&
			column.width === nextColumn.width &&
			areStringArraysEqual({ left: column.blockIds, right: nextColumn.blockIds })
		);
	});

const addIssue = ({
	issues,
	issue,
}: {
	issues: ColumnsReconciliationIssue[];
	issue: ColumnsReconciliationIssue;
}): void => {
	issues.push(issue);
};

const reconcileColumnsBlock = ({
	block,
	issues,
}: {
	block: BlockConfig;
	issues: ColumnsReconciliationIssue[];
}): ReconciledBlock => {
	const sourceResult = readColumnLayout(block);
	const sourceLayout = sourceResult.layout;
	const layout = sourceLayout ?? [{ ...DEFAULT_COLUMN, blockIds: [] }];
	const childIds = (block.children ?? []).map((child) => child.id);
	const childIdSet = new Set(childIds);
	const assignedColumnIds = new Map<string, string>();

	if (sourceLayout === null) {
		addIssue({
			issues,
			issue: {
				code: "MISSING_COLUMN_LAYOUT",
				columnsBlockId: block.id,
			},
		});
	}

	const nextLayout = layout.map((column) => {
		const nextBlockIds: string[] = [];

		for (const blockId of column.blockIds) {
			if (!childIdSet.has(blockId)) {
				addIssue({
					issues,
					issue: {
						code: "STALE_BLOCK_REFERENCE",
						columnsBlockId: block.id,
						blockId,
						columnId: column.columnId,
					},
				});
				continue;
			}

			if (assignedColumnIds.has(blockId)) {
				addIssue({
					issues,
					issue: {
						code: "DUPLICATE_BLOCK_MEMBERSHIP",
						columnsBlockId: block.id,
						blockId,
						columnId: column.columnId,
						keptColumnId: assignedColumnIds.get(blockId),
					},
				});
				continue;
			}

			assignedColumnIds.set(blockId, column.columnId);
			nextBlockIds.push(blockId);
		}

		return { ...column, blockIds: nextBlockIds };
	});

	const firstColumn = nextLayout[0];
	if (!firstColumn) {
		return {
			block: withReconciledSettings({
				block,
				columnLayout: [DEFAULT_COLUMN],
			}),
			changed: true,
		};
	}

	const orphanIds = childIds.filter((childId) => !assignedColumnIds.has(childId));
	for (const blockId of orphanIds) {
		addIssue({
			issues,
			issue: {
				code: "ORPHAN_CHILD",
				columnsBlockId: block.id,
				blockId,
				columnId: firstColumn.columnId,
			},
		});
		firstColumn.blockIds.push(blockId);
		assignedColumnIds.set(blockId, firstColumn.columnId);
	}

	const changed =
		sourceResult.malformed ||
		!areLayoutsEqual({ left: sourceLayout, right: nextLayout });
	return {
		block: changed ? withReconciledSettings({ block, columnLayout: nextLayout }) : block,
		changed,
	};
};

const withReconciledSettings = ({
	block,
	columnLayout,
}: {
	block: BlockConfig;
	columnLayout: ColumnLayout[];
}): BlockConfig => ({
	...block,
	settings: {
		...(block.settings ?? {}),
		columnLayout,
	},
});

const reconcileBlock = ({
	block,
	issues,
}: {
	block: BlockConfig;
	issues: ColumnsReconciliationIssue[];
}): ReconciledBlock => {
	const ownResult =
		block.name === "core/columns"
			? reconcileColumnsBlock({ block, issues })
			: { block, changed: false };

	const children = ownResult.block.children;
	if (!children) return ownResult;

	const childResult = reconcileBlockList({ blocks: children, issues });
	if (!childResult.changed) return ownResult;

	return {
		block: { ...ownResult.block, children: childResult.blocks },
		changed: true,
	};
};

const reconcileBlockList = ({
	blocks,
	issues,
}: {
	blocks: BlockConfig[];
	issues: ColumnsReconciliationIssue[];
}): { blocks: BlockConfig[]; changed: boolean } => {
	let changed = false;
	const nextBlocks = blocks.map((block) => {
		const result = reconcileBlock({ block, issues });
		changed ||= result.changed;
		return result.block;
	});

	return {
		blocks: changed ? nextBlocks : blocks,
		changed,
	};
};

/**
 * Reconciles every columns block without mutating input, so legacy trees can be
 * diagnosed and normalized before a future load/save integration.
 *
 * First membership wins by column order, then by `blockIds` order. Stale
 * references are removed. Unassigned direct children append to first column in
 * original `children` order, preserving legacy content deterministically.
 */
export function reconcileColumnLayouts({
	blocks,
}: {
	blocks: BlockConfig[];
}): ColumnsReconciliationResult {
	const issues: ColumnsReconciliationIssue[] = [];
	const result = reconcileBlockList({ blocks, issues });

	return {
		blocks: result.blocks,
		issues,
		changed: result.changed,
	};
}
