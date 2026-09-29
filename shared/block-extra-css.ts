import type { BlockConfig } from "./schema-types.js";
import { resolveBlockFills } from "./fill-model.js";
import { buildHeaderLookCss, HEADER_BLOCK_NAME, headerNeedsScript, readHeaderContent } from "./header-model.js";
import { buildHeaderScrollCss } from "./header-scroll-model.js";
import { ACCORDION_BLOCK_NAME, buildAccordionCss, readAccordionContent } from "./accordion-model.js";
import { POPUP_BLOCK_NAME, buildPopupCss, readPopupContent } from "./popup-model.js";

/**
 * True when the block is a header that needs the header script: a floating header with a
 * scrolled look, or a reading-progress bar to fill.
 */
export function headerHasScrollLook(block: Pick<BlockConfig, "name" | "content">): boolean {
	if (block.name !== HEADER_BLOCK_NAME) return false;
	return headerNeedsScript(readHeaderContent(block.content));
}

/**
 * CSS a block needs beyond its inline styles: a text fill's cut-out rules, and a floating
 * header's scrolled look. One place, so the editor, preview and published page always agree.
 */
export function blockExtraCss(block: BlockConfig): string {
	const fills = resolveBlockFills({ blockId: block.id, fills: block.other?.fills }).css;
	if (block.name === ACCORDION_BLOCK_NAME) {
		const accordion = buildAccordionCss({ blockId: block.id, content: readAccordionContent(block.content) });
		return [fills, accordion].filter(Boolean).join("\n");
	}
	if (block.name === POPUP_BLOCK_NAME) {
		const popup = buildPopupCss({ blockId: block.id, content: readPopupContent(block.content) });
		return [fills, popup].filter(Boolean).join("\n");
	}
	if (block.name !== HEADER_BLOCK_NAME) return fills;
	const content = readHeaderContent(block.content);
	const look = buildHeaderLookCss({ blockId: block.id, content });
	const scrolled =
		content.sticky && content.onScroll
			? buildHeaderScrollCss({ blockId: block.id, look: content.onScroll })
			: "";
	return [fills, look, scrolled].filter(Boolean).join("\n");
}
