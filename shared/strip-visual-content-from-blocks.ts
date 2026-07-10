import type { BlockConfig, BlockContent } from "@shared/schema-types";
import { readColumnsData, writeColumnsData } from "@shared/columns-layout";

/** Layout CSS keys that must not persist on group `content.data`. */
export const GROUP_LAYOUT_CONTENT_KEYS = [
	"display",
	"flexDirection",
	"flexWrap",
	"alignItems",
	"justifyContent",
	"gap",
	"rowGap",
	"columnGap",
	"gridTemplateColumns",
	"gridTemplateRows",
	"width",
	"maxWidth",
	"minWidth",
	"height",
	"maxHeight",
	"minHeight",
	"overflow",
] as const;

/** Visual keys on columns content that belong on `block.styles`. */
export const COLUMNS_VISUAL_CONTENT_KEYS = ["gap", "direction"] as const;

const stripStructuredDataKeys = (
	content: BlockContent,
	keys: readonly string[],
): BlockContent => {
	if (!content || typeof content !== "object" || !("kind" in content)) return content;
	if (content.kind !== "structured" || !content.data || typeof content.data !== "object") {
		return content;
	}
	const data = { ...(content.data as Record<string, unknown>) };
	for (const key of keys) {
		delete data[key];
	}
	return { ...content, data };
};

const stripGroupContent = (block: BlockConfig): BlockConfig => {
	if (block.name !== "core/group" && block.name !== "group") return block;
	if (!block.content) return block;
	return {
		...block,
		content: stripStructuredDataKeys(block.content, GROUP_LAYOUT_CONTENT_KEYS),
	};
};

const stripColumnsContent = (block: BlockConfig): BlockConfig => {
	if (block.name !== "core/columns") return block;
	if (!block.content) return block;
	const data = readColumnsData(block.content);
	const nextData = { ...data };
	for (const key of COLUMNS_VISUAL_CONTENT_KEYS) {
		delete nextData[key as keyof typeof nextData];
	}
	return {
		...block,
		content: writeColumnsData(block.content, nextData),
	};
};

const stripPullquoteContent = (block: BlockConfig): BlockConfig => {
	if (block.name !== "core/pullquote") return block;
	const content = block.content;
	if (!content || typeof content !== "object" || !("kind" in content)) return block;
	if (content.kind !== "text") return block;
	const { textAlign: _removed, ...rest } = content as Record<string, unknown>;
	return { ...block, content: rest as BlockContent };
};

/** Removes visual CSS fields mistakenly stored on semantic content before save. */
export const stripVisualContentFromBlock = (block: BlockConfig): BlockConfig => {
	let next = stripGroupContent(block);
	next = stripColumnsContent(next);
	next = stripPullquoteContent(next);
	if (next.children?.length) {
		next = {
			...next,
			children: next.children.map(stripVisualContentFromBlock),
		};
	}
	return next;
};

/** Strips legacy visual keys from every block in a page tree. */
export const stripVisualContentFromBlocks = (blocks: BlockConfig[]): BlockConfig[] =>
	blocks.map(stripVisualContentFromBlock);
