import type { BlockConfig } from "./schema-types.js";

/**
 * Fresh ids for a copied tree so the copy never shares ids with the original.
 * Child `parentId` values follow the new ids.
 */
export function reIdBlocks({
	blocks,
	generateId,
}: {
	blocks: readonly BlockConfig[];
	generateId: () => string;
}): BlockConfig[] {
	const walk = (items: readonly BlockConfig[], parentId: string | null): BlockConfig[] =>
		items.map((block) => {
			const id = generateId();
			return {
				...block,
				id,
				parentId,
				children: block.children ? walk(block.children, id) : undefined,
			};
		});
	return walk(blocks, null);
}
