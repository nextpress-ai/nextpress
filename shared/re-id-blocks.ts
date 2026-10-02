import type { BlockConfig } from "./schema-types.js";

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Saved CSS often names `.block-<id>`. After a copy, those selectors must follow the new ids
 * or the rule paints nothing. Generated header and phone rules are rebuilt later from the
 * current id; this only rewrites selectors already stored on the block.
 */
function rewriteStoredBlockSelectors(value: unknown, idMap: ReadonlyMap<string, string>): unknown {
	const fromIds = [...idMap.keys()].sort((a, b) => b.length - a.length);
	if (fromIds.length === 0) return value;
	const pattern = new RegExp(
		`\\.block-(${fromIds.map(escapeRegExp).join("|")})(?![A-Za-z0-9_-])`,
		"g",
	);
	const swap = (text: string): string =>
		text.replace(pattern, (_match, from: string) => `.block-${idMap.get(from) ?? from}`);

	const walk = (item: unknown): unknown => {
		if (typeof item === "string") return swap(item);
		if (Array.isArray(item)) return item.map(walk);
		if (item && typeof item === "object") {
			return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, walk(child)]));
		}
		return item;
	};
	return walk(value);
}

/**
 * Fresh ids for a copied tree so the copy never shares ids with the original.
 * Child `parentId` values follow the new ids, and stored `.block-<id>` selectors do too.
 */
export function reIdBlocks({
	blocks,
	generateId,
}: {
	blocks: readonly BlockConfig[];
	generateId: () => string;
}): BlockConfig[] {
	const idMap = new Map<string, string>();
	const assign = (items: readonly BlockConfig[], parentId: string | null): BlockConfig[] =>
		items.map((block) => {
			const id = generateId();
			idMap.set(block.id, id);
			return {
				...block,
				id,
				parentId,
				children: block.children ? assign(block.children, id) : undefined,
			};
		});
	const assigned = assign(blocks, null);
	return rewriteStoredBlockSelectors(assigned, idMap) as BlockConfig[];
}
