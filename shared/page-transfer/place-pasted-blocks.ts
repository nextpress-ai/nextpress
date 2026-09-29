import type { BlockConfig } from "../schema-types.js";
import { findRootPageShell, ensureRootPageShell } from "../page-shell-model.js";
import { reIdBlocks } from "../re-id-blocks.js";

export type PasteAllMode = "replace" | "append";

/**
 * Puts a whole copied page (or several copied blocks) into the current page.
 * - `replace`: the copied page, with its page look, becomes this page.
 * - `append`: the copied blocks go after this page's blocks; this page keeps its look.
 * Pasted blocks always get fresh ids, so two pastes never share ids.
 */
export function placePastedBlocks({
	current,
	pasted,
	mode,
	generateId,
}: {
	current: BlockConfig[];
	pasted: BlockConfig[];
	mode: PasteAllMode;
	generateId: () => string;
}): BlockConfig[] {
	const fresh = reIdBlocks({ blocks: pasted, generateId });
	const pastedShell = findRootPageShell(fresh);
	const pastedBody = pastedShell ? (pastedShell.children ?? []) : fresh;

	if (mode === "replace" && pastedShell) {
		return ensureRootPageShell({ blocks: fresh, shellId: generateId() }).blocks;
	}

	const [shell] = ensureRootPageShell({ blocks: current, shellId: generateId() }).blocks;
	if (!shell) return current;
	const keptChildren = mode === "replace" ? [] : (shell.children ?? []);
	return [
		{
			...shell,
			children: [...keptChildren, ...pastedBody.map((child) => ({ ...child, parentId: shell.id }))],
		},
	];
}
