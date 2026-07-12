import type { BlockConfig } from "../types/domain.js";
import type { ColumnsBlockParams } from "../blocks/block-params.js";
import { applyEditorSettings } from "../blocks/apply-editor-settings.js";
import { normalizeBlockSubtree } from "../blocks/normalize-block-tree.js";
import {
	buildColumnsLayout,
	buildColumnsLayoutFromGroups,
	DEFAULT_COLUMNS_CONTENT,
	type ColumnLayout,
} from "./columns-layout.js";

const mergeSettings = (
	base: ColumnsBlockParams["settings"],
	override: NonNullable<ColumnsBlockParams["settings"]>,
): NonNullable<ColumnsBlockParams["settings"]> => ({
	content: { ...base?.content, ...override.content },
	styles: { ...base?.styles, ...override.styles },
	advanced: { ...base?.advanced, ...override.advanced },
});

/**
 * Builds a `core/columns` block with `settings.columnLayout` so preview/publish
 * match the dashboard multi-column layout.
 */
export const buildColumnsBlock = (params: ColumnsBlockParams = {}): BlockConfig => {
	const { columnCount, columnGroups, children, settings, ...shell } = params;

	let childBlocks: BlockConfig[];
	let columnLayout: ColumnLayout[];

	if (columnGroups?.length) {
		childBlocks = columnGroups.flat();
		columnLayout = buildColumnsLayoutFromGroups(columnGroups);
	} else {
		childBlocks = children ?? [];
		const count =
			columnCount ??
			(typeof settings?.content?.columns === "number" ? settings.content.columns : undefined) ??
			(childBlocks.length > 1 ? Math.min(childBlocks.length, 2) : 2);
		columnLayout = buildColumnsLayout(count, childBlocks);
	}

	const gap = settings?.styles?.gap ?? "20px";

	const mergedSettings = mergeSettings(settings, {
		content: {
			...DEFAULT_COLUMNS_CONTENT,
			...settings?.content,
		},
		styles: {
			gap,
			...settings?.styles,
		},
		advanced: {
			columnLayout,
			...settings?.advanced,
		},
	});

	const block = applyEditorSettings({
		name: "core/columns",
		...shell,
		children: childBlocks,
		settings: mergedSettings,
	});

	return childBlocks.length ? normalizeBlockSubtree(block) : block;
};
