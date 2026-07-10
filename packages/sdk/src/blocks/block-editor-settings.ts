import type { BlockSettings, BlockStyles } from "./block-params.js";

/** Advanced tab fields mirrored from the dashboard block settings panel. */
export type BlockAdvancedSettings = BlockSettings;

/**
 * Editor tab bundle — Content (semantics), Style (inline CSS), Advanced (options).
 * Matches the page builder Content / Style / Advanced tabs.
 */
export type BlockEditorSettings<TSemanticContent extends Record<string, unknown> = Record<string, unknown>> = {
	/** Content tab — semantics only (text, urls, tagName, structural options). */
	content?: Partial<TSemanticContent>;
	/** Style tab — all inline CSS on the block shell. */
	styles?: BlockStyles;
	/** Advanced tab — animation, anchor, columnLayout, displayConditions, etc. */
	advanced?: BlockAdvancedSettings;
};

/** Shell params plus nested editor settings and sanitized escape hatches. */
export type BlockWithEditorSettings<TSemanticContent extends Record<string, unknown> = Record<string, unknown>> = {
	id?: string;
	parentId?: string | null;
	label?: string;
	children?: import("../types/domain.js").BlockConfig[];
	html?: string;
	js?: string;
	css?: string;
	settings?: BlockEditorSettings<TSemanticContent>;
};
