import type { BlockConfig } from "./schema-types.js";
import { blockExtraCss, headerHasScrollLook } from "./block-extra-css.js";

/** `blockExtraCss` for a whole block tree, ready for a published page's head. */
export function collectBlockExtraCss(blocks: readonly BlockConfig[]): string {
	const rules = blocks.flatMap((block): string[] => [blockExtraCss(block), collectBlockExtraCss(block.children ?? [])]);
	return rules.filter(Boolean).join("\n");
}

/** True when any block in the tree is a floating header with a scrolled look (it needs the scroll script). */
export function treeHasScrollingHeader(blocks: readonly BlockConfig[]): boolean {
	return blocks.some((block) => headerHasScrollLook(block) || treeHasScrollingHeader(block.children ?? []));
}
