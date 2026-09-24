import type { BlockConfig } from "@shared/schema-types";
import { findRootPageShell } from "@shared/page-shell-model";

export type TopLevelBlockOption = {
	id: string;
	label: string;
};

/** Page shell and its direct children, or the root blocks when the page has no shell. */
export function listTopLevelBlocks(blocks: BlockConfig[]): BlockConfig[] {
	const shell = findRootPageShell(blocks);
	if (!shell) return blocks;
	const children = Array.isArray(shell.children) ? shell.children : [];
	return [shell, ...children];
}

const blockContains = (block: BlockConfig, targetId: string): boolean => {
	if (block.id === targetId) return true;
	if (!Array.isArray(block.children)) return false;
	return block.children.some((child) => blockContains(child, targetId));
};

/**
 * The block the page list should show: the selection itself when it is top-level,
 * otherwise the top-level block that contains it.
 */
export function topLevelSelectionId(blocks: BlockConfig[], selectedId: string | null): string | undefined {
	if (!selectedId) return undefined;
	const list = listTopLevelBlocks(blocks);
	if (list.some((block) => block.id === selectedId)) return selectedId;
	const shell = findRootPageShell(blocks);
	const owner = list
		.filter((block) => block.id !== shell?.id)
		.find((block) => blockContains(block, selectedId));
	if (owner) return owner.id;
	if (shell && blockContains(shell, selectedId)) return shell.id;
	return undefined;
}

const textSnippet = (block: BlockConfig): string => {
	const content = block.content;
	if (!content) return "";
	const raw =
		content.kind === "text" || content.kind === "markdown" || content.kind === "html"
			? content.value
			: content.kind === "media"
				? (content.alt ?? "")
				: "";
	return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 28);
};

const baseName = (block: BlockConfig, names: Record<string, string>): string =>
	block.label?.trim() || names[block.name] || "Block";

/** Labels for the page list. Matching names pick up a short bit of the block's text. */
export function topLevelBlockOptions(blocks: BlockConfig[], names: Record<string, string>): TopLevelBlockOption[] {
	const list = listTopLevelBlocks(blocks);
	const bases = list.map((block) => baseName(block, names));
	return list.map((block, index) => {
		const base = bases[index] ?? "Block";
		const duplicates = bases.filter((name) => name === base).length;
		if (duplicates < 2) return { id: block.id, label: base };
		const snippet = textSnippet(block);
		if (snippet) return { id: block.id, label: `${base} — ${snippet}` };
		const nth = bases.slice(0, index + 1).filter((name) => name === base).length;
		return { id: block.id, label: `${base} ${nth}` };
	});
}
