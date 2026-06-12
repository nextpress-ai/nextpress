import type { BlockConfig } from "@shared/schema-types";
import { generateBlockId } from "@/components/PageBuilder/utils";

/**
 * Deep-clones template blocks with fresh IDs so they can be inserted into a page
 * without colliding with existing canvas blocks.
 */
export function reIdTemplateBlocks(blocks: BlockConfig[]): BlockConfig[] {
	const reId = (items: BlockConfig[]): BlockConfig[] =>
		items.map((block) => ({
			...block,
			id: generateBlockId(),
			children: block.children ? reId(block.children) : undefined,
		}));

	return reId(blocks);
}
