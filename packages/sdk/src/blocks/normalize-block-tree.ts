import type { BlockConfig } from "../types/domain.js";

/** Recursively assigns `parentId` on nested children for editor drag/edit. */
export const normalizeBlockTree = (
	blocks: BlockConfig[],
	parentId: string | null = null,
): BlockConfig[] =>
	blocks.map((block) => {
		const children = block.children?.length
			? normalizeBlockTree(block.children, block.id)
			: block.children;
		return { ...block, parentId, children };
	});

/** Normalizes a single block subtree (root keeps its `parentId`). */
export const normalizeBlockSubtree = (block: BlockConfig): BlockConfig => {
	if (!block.children?.length) return block;
	return { ...block, children: normalizeBlockTree(block.children, block.id) };
};
