import { createDefaultBlock } from "@shared/block-catalog";
import { fitToDocsColumn } from "@shared/docs/docs-column-spacing";
import type { JsonObject } from "@shared/blocks/docs-types";
import { escapeHtml, inlineMarkdownToHtml } from "@shared/markdown/inline-html";
import type { BlockConfig } from "@shared/schema-types";
import { deleteBlockDeep, findBlock, findParentBlock, updateBlockDeep } from "@/lib/handlers/treeUtils";

/**
 * Writing in the docs editor, as plain rules on the page's blocks: what Enter, Backspace, a marker
 * typed at the start of a paragraph and the "/" menu do. Kept apart from the screen so each rule is
 * tested on its own; the docs editor applies the result as one undo step.
 */

/** The block a paragraph becomes, and the fields it starts with. */
export type WritingTurn = { name: string; data: JsonObject };

const oneLine = (text: string): string => text.replace(/\s*\n\s*/g, " ");
const listOf = ({ style, text }: { style: "bullet" | "number" | "check"; text: string }): WritingTurn => ({
	name: "core/list",
	data: { ordered: style === "number", values: `<li>${inlineMarkdownToHtml(oneLine(text))}</li>`, marker: style === "check" ? "check" : "default" },
});

/** The words of a paragraph or heading as the fields the blocks keep them in: inline HTML, marked as such. */
export const textFields = (markdown: string): JsonObject => ({ value: inlineMarkdownToHtml(markdown), format: "html" });

/** Markers in the order they are tried; each takes the text typed after it along. */
const MARKERS: ReadonlyArray<{ pattern: RegExp; turn: (match: RegExpMatchArray) => WritingTurn }> = [
	{ pattern: /^(#{2,4}) ([\s\S]*)$/, turn: (match) => ({ name: "core/heading", data: { level: match[1].length, ...textFields(oneLine(match[2])) } }) },
	{ pattern: /^\[ ?\] ([\s\S]*)$/, turn: (match) => listOf({ style: "check", text: match[1] }) },
	{ pattern: /^[-*] ([\s\S]*)$/, turn: (match) => listOf({ style: "bullet", text: match[1] }) },
	{ pattern: /^1[.)] ([\s\S]*)$/, turn: (match) => listOf({ style: "number", text: match[1] }) },
	{ pattern: /^> ([\s\S]*)$/, turn: (match) => ({ name: "core/quote", data: { value: `<p>${escapeHtml(oneLine(match[1]))}</p>`, citation: "" } }) },
	{ pattern: /^```([\s\S]*)$/, turn: (match) => ({ name: "core/code", data: { content: match[1].replace(/^\n/, ""), language: "" } }) },
];

/**
 * The block a paragraph turns into when a marker at its start was just completed (`## `, `- `,
 * `1. `, `[] `, `> `, three backticks). Null when nothing was completed by this change: a paragraph
 * that already started with "- " and is edited further stays a paragraph.
 */
export function readWritingTurn({ previous, next }: { previous: string; next: string }): WritingTurn | null {
	for (const { pattern, turn } of MARKERS) {
		const match = next.match(pattern);
		if (match && !pattern.test(previous)) return turn(match);
	}
	return null;
}

/** What follows a "/" that opens a paragraph, or null when the paragraph is not a "/" command. */
export function readSlashQuery(text: string): string | null {
	const match = text.match(/^\/([a-z0-9 -]*)$/i);
	return match ? match[1] : null;
}

/** The text on either side of the selection, for Enter splitting a paragraph in two. */
export const splitText = ({ text, start, end }: { text: string; start: number; end: number }): { before: string; after: string } => ({
	before: text.slice(0, start),
	after: text.slice(end),
});

/** Spacing between the blocks of a written page: the reading column is the only inset. */
const PROSE_STYLES: Readonly<Record<string, NonNullable<BlockConfig["styles"]>>> = {
	"core/paragraph": { margin: "0 0 16px", padding: "0" },
	"core/heading": { margin: "28px 0 10px", padding: "0" },
	"core/list": { margin: "0 0 16px", padding: "0" },
};

/** A new block of `name` with the catalog's starting fields and `data` on top, or null for a name NextPress does not know. */
export function buildWritingBlock({ name, data = {}, newId, parentId }: { name: string; data?: JsonObject; newId: () => string; parentId: string | null }): BlockConfig | null {
	const made = createDefaultBlock({ name, id: newId(), newId });
	if (!made) return null;
	const block = { ...fitToDocsColumn(made), styles: { ...fitToDocsColumn(made).styles, ...PROSE_STYLES[name] } };
	return { ...block, parentId, ...(Object.keys(data).length > 0 ? withData({ block, data }) : {}) };
}

function withData({ block, data }: { block: BlockConfig; data: JsonObject }): Partial<BlockConfig> {
	const content = block.content;
	// Text blocks (paragraph, heading) keep their fields beside `kind`; the rest keep them under `data`.
	if (content && "kind" in content && content.kind === "text") return { content: { ...content, ...data } as BlockConfig["content"] };
	const current = content && "kind" in content && content.kind === "structured" ? content.data : {};
	return { content: { kind: "structured", data: { ...current, ...data } } };
}

/**
 * Puts `block` right after `targetId`, wherever that sits in the tree, keeping every id `block`
 * already has (new blocks come with fresh ids for themselves and everything inside them).
 */
function insertAfter({ blocks, targetId, block }: { blocks: BlockConfig[]; targetId: string; block: BlockConfig }): BlockConfig[] | null {
	const index = blocks.findIndex((candidate) => candidate.id === targetId);
	if (index >= 0) return [...blocks.slice(0, index + 1), block, ...blocks.slice(index + 1)];
	for (const [position, candidate] of blocks.entries()) {
		const children = candidate.children ? insertAfter({ blocks: candidate.children, targetId, block }) : null;
		if (children) return blocks.map((original, at) => (at === position ? { ...original, children } : original));
	}
	return null;
}

/** Where an edit leaves the writer: the block to edit next and where the caret goes in it. */
export type WritingResult = { blocks: BlockConfig[]; editId: string; caret: "start" | "end" };

/** Enter in a paragraph or heading: it keeps the text before the caret, and a new paragraph after it starts with the rest. */
export function splitBlock({ blocks, blockId, before, after, newId }: { blocks: BlockConfig[]; blockId: string; before: string; after: string; newId: () => string }): WritingResult | null {
	const block = findBlock(blocks, blockId);
	if (!block) return null;
	const paragraph = buildWritingBlock({ name: "core/paragraph", data: textFields(after), newId, parentId: findParentBlock(blocks, blockId)?.id ?? null });
	if (!paragraph) return null;
	const kept = updateBlockDeep(blocks, blockId, withData({ block, data: textFields(before) })).next;
	const next = insertAfter({ blocks: kept, targetId: blockId, block: paragraph });
	return next ? { blocks: next, editId: paragraph.id, caret: "start" } : null;
}

/** Enter on an empty line of a list: the list ends there and a new paragraph opens under it (an entirely empty list turns into the paragraph). */
export function leaveList({ blocks, blockId, newId }: { blocks: BlockConfig[]; blockId: string; newId: () => string }): WritingResult | null {
	const block = findBlock(blocks, blockId);
	if (!block) return null;
	const content = block.content;
	const values = content && "kind" in content && content.kind === "structured" ? String(content.data.values ?? "") : "";
	if (values.replace(/<[^>]*>/g, "").trim() === "") return replaceBlock({ blocks, blockId, name: "core/paragraph", data: textFields(""), newId });
	const paragraph = buildWritingBlock({ name: "core/paragraph", data: textFields(""), newId, parentId: findParentBlock(blocks, blockId)?.id ?? null });
	if (!paragraph) return null;
	const next = insertAfter({ blocks, targetId: blockId, block: paragraph });
	return next ? { blocks: next, editId: paragraph.id, caret: "start" } : null;
}

/** A marker or the "/" menu: the paragraph is replaced by the new block, which opens for editing. */
export function replaceBlock({ blocks, blockId, name, data, newId }: { blocks: BlockConfig[]; blockId: string; name: string; data?: JsonObject; newId: () => string }): WritingResult | null {
	const replacement = buildWritingBlock({ name, data, newId, parentId: findParentBlock(blocks, blockId)?.id ?? null });
	if (!replacement) return null;
	const next = insertAfter({ blocks, targetId: blockId, block: replacement });
	if (!next) return null;
	return { blocks: deleteBlockDeep(next, blockId).next, editId: replacement.id, caret: "end" };
}

/** Blocks a writer can carry on typing in, so Backspace in an empty paragraph moves into the one above. */
const TYPED_IN: ReadonlySet<string> = new Set(["core/paragraph", "core/heading", "core/list"]);

/** Backspace in an empty paragraph: it goes, and the writer continues at the end of the block above when that one takes typing. */
export function removeEmptyBlock({ blocks, blockId }: { blocks: BlockConfig[]; blockId: string }): (Omit<WritingResult, "editId"> & { editId: string | null }) | null {
	const parent = findParentBlock(blocks, blockId);
	const siblings = parent?.children ?? blocks;
	const index = siblings.findIndex((child) => child.id === blockId);
	if (index < 0) return null;
	const above = index > 0 ? siblings[index - 1] : null;
	return { blocks: deleteBlockDeep(blocks, blockId).next, editId: above && TYPED_IN.has(above.name) ? above.id : null, caret: "end" };
}
