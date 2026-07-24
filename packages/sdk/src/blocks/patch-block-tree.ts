import type { BlockConfig } from "../types/domain.js";
import { normalizeBlockTree } from "./normalize-block-tree.js";
import { validateBlockTree, type BlockValidationIssue } from "./validate-block-tree.js";

export type BlockPatchOp =
	| {
			op: "insert";
			/** null = root of the page tree */
			parentId: string | null;
			/** Default: append */
			index?: number;
			block: BlockConfig;
	  }
	| {
			op: "update";
			id: string;
			set: {
				label?: string;
				content?: BlockConfig["content"];
				styles?: BlockConfig["styles"];
				settings?: BlockConfig["settings"];
				customCss?: string;
				other?: BlockConfig["other"];
			};
	  }
	| { op: "delete"; id: string }
	| {
			op: "move";
			id: string;
			parentId: string | null;
			index?: number;
	  };

export type PatchBlockTreeOk = {
	ok: true;
	blocks: BlockConfig[];
	summary: {
		inserted: string[];
		updated: string[];
		deleted: string[];
		moved: string[];
	};
};

export type PatchBlockTreeErr = {
	ok: false;
	error: {
		code: "PATCH_FAILED" | "VALIDATION_FAILED";
		message: string;
		opIndex?: number;
		blockId?: string;
		issues?: BlockValidationIssue[];
	};
};

export type PatchBlockTreeResult = PatchBlockTreeOk | PatchBlockTreeErr;

type Located = {
	block: BlockConfig;
	parentChildren: BlockConfig[];
	index: number;
	parentId: string | null;
};

/**
 * Apply ordered path ops to a block tree, then normalize parentIds and validate.
 * Pure — does not hit the network. Callers persist via pages.update / posts.update.
 */
export function patchBlockTree({
	blocks,
	ops,
	validate = true,
}: {
	blocks: BlockConfig[];
	ops: BlockPatchOp[];
	validate?: boolean;
}): PatchBlockTreeResult {
	let tree = cloneTree(blocks);
	const summary = {
		inserted: [] as string[],
		updated: [] as string[],
		deleted: [] as string[],
		moved: [] as string[],
	};

	for (let opIndex = 0; opIndex < ops.length; opIndex++) {
		const op = ops[opIndex];
		const applied = applyOne({ tree, op, opIndex });
		if (!applied.ok) {
			return applied;
		}
		tree = applied.tree;
		if (op.op === "insert") summary.inserted.push(op.block.id);
		if (op.op === "update") summary.updated.push(op.id);
		if (op.op === "delete") summary.deleted.push(op.id);
		if (op.op === "move") summary.moved.push(op.id);
	}

	const normalized = normalizeBlockTree(tree, null);

	if (validate) {
		const validation = validateBlockTree(normalized);
		if (!validation.ok) {
			return {
				ok: false,
				error: {
					code: "VALIDATION_FAILED",
					message: "Patched tree failed validation",
					issues: validation.issues,
				},
			};
		}
	}

	return { ok: true, blocks: normalized, summary };
}

function applyOne({
	tree,
	op,
	opIndex,
}: {
	tree: BlockConfig[];
	op: BlockPatchOp;
	opIndex: number;
}): { ok: true; tree: BlockConfig[] } | PatchBlockTreeErr {
	if (op.op === "insert") {
		const target = findChildrenArray(tree, op.parentId);
		if (!target) {
			return fail(opIndex, `insert parentId "${op.parentId}" not found`, op.parentId ?? undefined);
		}
		if (findBlock(tree, op.block.id)) {
			return fail(opIndex, `insert id "${op.block.id}" already exists`, op.block.id);
		}
		const index = op.index === undefined ? target.length : clampIndex(op.index, target.length);
		target.splice(index, 0, cloneTree([op.block])[0]);
		return { ok: true, tree };
	}

	if (op.op === "update") {
		const located = locateBlock(tree, op.id);
		if (!located) {
			return fail(opIndex, `update id "${op.id}" not found`, op.id);
		}
		const next: BlockConfig = {
			...located.block,
			...("label" in op.set ? { label: op.set.label } : {}),
			...("content" in op.set ? { content: op.set.content as BlockConfig["content"] } : {}),
			...("styles" in op.set ? { styles: op.set.styles } : {}),
			...("settings" in op.set ? { settings: op.set.settings } : {}),
			...("customCss" in op.set ? { customCss: op.set.customCss } : {}),
			...("other" in op.set ? { other: op.set.other } : {}),
		};
		located.parentChildren[located.index] = next;
		return { ok: true, tree };
	}

	if (op.op === "delete") {
		const located = locateBlock(tree, op.id);
		if (!located) {
			return fail(opIndex, `delete id "${op.id}" not found`, op.id);
		}
		located.parentChildren.splice(located.index, 1);
		return { ok: true, tree };
	}

	// move
	const located = locateBlock(tree, op.id);
	if (!located) {
		return fail(opIndex, `move id "${op.id}" not found`, op.id);
	}
	if (op.parentId === op.id || isDescendant(located.block, op.parentId)) {
		return fail(opIndex, `cannot move "${op.id}" into itself or a descendant`, op.id);
	}
	const [removed] = located.parentChildren.splice(located.index, 1);
	const dest = findChildrenArray(tree, op.parentId);
	if (!dest) {
		// restore
		located.parentChildren.splice(located.index, 0, removed);
		return fail(opIndex, `move parentId "${op.parentId}" not found`, op.parentId ?? undefined);
	}
	const index = op.index === undefined ? dest.length : clampIndex(op.index, dest.length);
	dest.splice(index, 0, removed);
	return { ok: true, tree };
}

function fail(opIndex: number, message: string, blockId?: string): PatchBlockTreeErr {
	return {
		ok: false,
		error: { code: "PATCH_FAILED", message, opIndex, blockId },
	};
}

function cloneTree(blocks: BlockConfig[]): BlockConfig[] {
	return structuredClone(blocks);
}

function clampIndex(index: number, length: number): number {
	if (index < 0) return 0;
	if (index > length) return length;
	return index;
}

function findChildrenArray(tree: BlockConfig[], parentId: string | null): BlockConfig[] | null {
	if (parentId === null) return tree;
	const parent = findBlock(tree, parentId);
	if (!parent) return null;
	if (!parent.children) parent.children = [];
	return parent.children;
}

function findBlock(tree: BlockConfig[], id: string): BlockConfig | null {
	return locateBlock(tree, id)?.block ?? null;
}

function locateBlock(tree: BlockConfig[], id: string): Located | null {
	const search = (
		nodes: BlockConfig[],
		parentId: string | null,
	): Located | null => {
		for (let index = 0; index < nodes.length; index++) {
			const block = nodes[index];
			if (block.id === id) {
				return { block, parentChildren: nodes, index, parentId };
			}
			if (block.children?.length) {
				const found = search(block.children, block.id);
				if (found) return found;
			}
		}
		return null;
	};
	return search(tree, null);
}

function isDescendant(root: BlockConfig, maybeChildId: string | null): boolean {
	if (!maybeChildId) return false;
	const walk = (block: BlockConfig): boolean => {
		if (!block.children?.length) return false;
		for (const child of block.children) {
			if (child.id === maybeChildId) return true;
			if (walk(child)) return true;
		}
		return false;
	};
	return walk(root);
}
