import { inlineMarkdownToHtml } from "../markdown/inline-html.js";
import type { BlockConfig } from "../schema-types.js";
import { readDocsHeadingContent } from "../blocks/docs-heading-model.js";
import { readDocsListContent, shownListItems, type DocsListSubItem } from "../blocks/docs-list-model.js";
import { readDocsTextContent } from "../blocks/docs-text-model.js";

/**
 * Docs pages used to keep their words in three special blocks (`docs/text`, `docs/heading`,
 * `docs/list`) that stored inline markdown. Docs now use the same heading, paragraph and list
 * blocks as every other page. This file turns the old blocks into the new ones, so a page saved
 * before the change keeps its words and its place.
 */

export const LEGACY_PROSE_BLOCK_NAMES: ReadonlySet<string> = new Set(["docs/text", "docs/heading", "docs/list"]);

export { inlineMarkdownToHtml };

const itemHtml = (item: DocsListSubItem): string => inlineMarkdownToHtml(item.text);

const listValues = ({ items, ordered }: { items: ReturnType<typeof shownListItems>; ordered: boolean }): string => {
	const tag = ordered ? "ol" : "ul";
	return items
		.map((item) => {
			const nested = item.children.length > 0 ? `<${tag}>${item.children.map((child) => `<li>${itemHtml(child)}</li>`).join("")}</${tag}>` : "";
			return `<li>${itemHtml(item)}${nested}</li>`;
		})
		.join("");
};

/** One old prose block as its new block (same id, same styles); any other block is returned as it is. */
export function convertLegacyProseBlock(block: BlockConfig): BlockConfig {
	if (block.name === "docs/text") {
		const { text } = readDocsTextContent(block.content);
		return { ...block, name: "core/paragraph", content: { kind: "text", value: inlineMarkdownToHtml(text), format: "html", dropCap: false, anchor: "", className: "" } as BlockConfig["content"] };
	}
	if (block.name === "docs/heading") {
		const { level, text, anchor } = readDocsHeadingContent(block.content);
		return { ...block, name: "core/heading", content: { kind: "text", value: inlineMarkdownToHtml(text), format: "html", level, anchor, className: "" } as BlockConfig["content"] };
	}
	if (block.name === "docs/list") {
		const { style, items } = readDocsListContent(block.content);
		const ordered = style === "number";
		const values = listValues({ items: shownListItems(items), ordered });
		return { ...block, name: "core/list", content: { kind: "structured", data: { ordered, values, marker: style === "check" ? "check" : "default", anchor: "", className: "" } } as BlockConfig["content"] };
	}
	return block;
}

/** The old prose blocks anywhere in a block tree. */
export const hasLegacyProse = (blocks: BlockConfig[]): boolean =>
	blocks.some((block) => LEGACY_PROSE_BLOCK_NAMES.has(block.name) || hasLegacyProse(block.children ?? []));

/** A whole block tree with every old prose block replaced; the tree is returned as it was when it holds none. */
export function convertLegacyProse(blocks: BlockConfig[]): BlockConfig[] {
	if (!hasLegacyProse(blocks)) return blocks;
	return blocks.map((block) => {
		const converted = convertLegacyProseBlock(block);
		return converted.children ? { ...converted, children: convertLegacyProse(converted.children) } : converted;
	});
}
