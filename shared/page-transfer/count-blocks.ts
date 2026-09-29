import type { BlockConfig } from "../schema-types.js";
import { findRootPageShell } from "../page-shell-model.js";

const countTree = (blocks: readonly BlockConfig[]): number =>
	blocks.reduce((total, block) => total + 1 + countTree(block.children ?? []), 0);

/**
 * Blocks a person sees on the page: everything inside the page shell, not the shell itself,
 * so import, copy and paste all report the same number.
 */
export function countPageBlocks(blocks: readonly BlockConfig[]): number {
	const shell = findRootPageShell([...blocks]);
	return shell ? countTree(shell.children ?? []) : countTree(blocks);
}
