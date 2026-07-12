import type { BlockConfig } from "../types/domain.js";
import { BLOCK_DEFINITIONS, type BlockName } from "../blocks/block-definitions.js";

/** @see shared/import/wordpress/import-defaults.ts — keep in sync */
export const SDK_BLOCK_BASE_PADDING = "20px";
export const SDK_BLOCK_BASE_MARGIN = "0px";

export const SDK_BLOCK_UNITS = {
	spacing: "px",
	font: "rem",
	dimension: "px",
	border: "px",
} as const;

/** Extra margins aligned with the dashboard block registry. */
const SDK_LAYOUT_BLOCK_STYLES: Partial<Record<BlockName, Record<string, string>>> = {
	"core/columns": { margin: "1em 0" },
	"core/buttons": { margin: "1em 0" },
	"core/gallery": { margin: "1em 0", width: "100%" },
	"core/quote": { margin: "1em 0" },
	"core/separator": { margin: "1em 0" },
	"core/image": { width: "100%" },
};

/**
 * Applies editor-native block scaffolding so SDK-built trees match dashboard inserts.
 * Caller styles and `other` fields win on conflict.
 */
export const applySdkBlockDefaults = (block: BlockConfig): BlockConfig => {
	const def = BLOCK_DEFINITIONS[block.name as BlockName];
	const layoutStyles = SDK_LAYOUT_BLOCK_STYLES[block.name as BlockName] ?? {};

	const withDefaults: BlockConfig = {
		...block,
		styles: {
			padding: SDK_BLOCK_BASE_PADDING,
			margin: SDK_BLOCK_BASE_MARGIN,
			...layoutStyles,
			...(def?.defaultStyles ?? {}),
			...block.styles,
		},
		settings: block.settings ?? {},
		other: {
			tokenMap: {},
			units: { ...SDK_BLOCK_UNITS },
			...(block.other ?? {}),
		},
	};

	if (block.children?.length) {
		withDefaults.children = block.children.map(applySdkBlockDefaults);
	}

	return withDefaults;
};

/** Applies block defaults to every root block in a page tree. */
export const applySdkBlockTreeDefaults = (blocks: BlockConfig[]): BlockConfig[] =>
	blocks.map(applySdkBlockDefaults);
