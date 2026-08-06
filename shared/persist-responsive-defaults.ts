import type { BlockConfig } from "./schema-types.js";
import { applyResponsiveDefaults } from "./render-defaults.js";

export type PersistResponsiveDefaultsResult = {
	blocks: BlockConfig[];
	changedCount: number;
};

const mergeClassNames = ({
	existing,
	additions,
}: {
	existing: string | undefined;
	additions: string[];
}): string | undefined => {
	const set = new Set((existing ?? "").split(/\s+/).filter(Boolean));
	let changed = false;
	for (const cls of additions) {
		if (!set.has(cls)) {
			set.add(cls);
			changed = true;
		}
	}
	if (!changed) return existing;
	const merged = [...set].join(" ");
	return merged || undefined;
};

const persistBlockDefaults = (block: BlockConfig): { block: BlockConfig; changed: boolean } => {
	const defaults = applyResponsiveDefaults({ block, tier: "large" });
	const styles = { ...(block.styles ?? {}) };
	let stylesChanged = false;

	for (const [key, value] of Object.entries(defaults.styles)) {
		if (styles[key as keyof typeof styles] === undefined && value != null) {
			(styles as Record<string, string | number>)[key] = value as string | number;
			stylesChanged = true;
		}
	}

	const nextClassNames = mergeClassNames({
		existing: block.other?.classNames,
		additions: defaults.classNames,
	});
	const classNamesChanged = nextClassNames !== block.other?.classNames;

	let childrenChanged = false;
	const nextChildren = block.children?.map((child) => {
		const result = persistBlockDefaults(child);
		if (result.changed) childrenChanged = true;
		return result.block;
	});

	const changed = stylesChanged || classNamesChanged || childrenChanged;
	if (!changed) {
		return { block, changed: false };
	}

	return {
		block: {
			...block,
			styles: stylesChanged ? styles : block.styles,
			other:
				classNamesChanged
					? { ...block.other, classNames: nextClassNames }
					: block.other,
			children: childrenChanged ? nextChildren : block.children,
		},
		changed: true,
	};
};

/**
 * Writes responsive defaults into block data for fields the user has not set.
 * Idempotent — safe to run multiple times.
 */
export function persistResponsiveDefaultsToBlocks({
	blocks,
}: {
	blocks: BlockConfig[];
}): PersistResponsiveDefaultsResult {
	let changedCount = 0;
	const nextBlocks = blocks.map((block) => {
		const result = persistBlockDefaults(block);
		if (result.changed) changedCount += 1;
		return result.block;
	});
	return { blocks: nextBlocks, changedCount };
}
