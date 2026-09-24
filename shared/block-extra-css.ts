import type { BlockConfig } from "./schema-types.js";
import { resolveBlockFills } from "./fill-model.js";
import { HEADER_BLOCK_NAME, readHeaderContent } from "./header-model.js";
import { buildHeaderScrollCss } from "./header-scroll-model.js";

/** True when the block is a floating header that has a scrolled look to apply. */
export function headerHasScrollLook(block: Pick<BlockConfig, "name" | "content">): boolean {
	if (block.name !== HEADER_BLOCK_NAME) return false;
	const content = readHeaderContent(block.content);
	return content.sticky && content.onScroll !== undefined;
}

/**
 * CSS a block needs beyond its inline styles: a text fill's cut-out rules, and a floating
 * header's scrolled look. One place, so the editor, preview and published page always agree.
 */
export function blockExtraCss(block: BlockConfig): string {
	const fills = resolveBlockFills({ blockId: block.id, fills: block.other?.fills }).css;
	const header = headerHasScrollLook(block)
		? buildHeaderScrollCss({ blockId: block.id, look: readHeaderContent(block.content).onScroll })
		: "";
	return [fills, header].filter(Boolean).join("\n");
}
