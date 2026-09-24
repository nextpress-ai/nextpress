import type { BlockConfig } from "@shared/schema-types";
import { reIdBlocks } from "@shared/re-id-blocks";
import { generateBlockId } from "@/components/PageBuilder/utils";

/**
 * Deep-clones template blocks with fresh IDs so they can be inserted into a page
 * without colliding with existing canvas blocks.
 */
export function reIdTemplateBlocks(blocks: BlockConfig[]): BlockConfig[] {
	return reIdBlocks({ blocks, generateId: generateBlockId });
}
