import type { BlockConfig } from "./schema-types";
import { readBlockContentData } from "./read-block-content";

export type CollectedPostFields = {
	title?: string;
	excerpt?: string;
	featuredImage?: string;
};

const isDefaultTitle = (text: string): boolean =>
	text.trim().toLowerCase() === "post title";

const isDefaultExcerpt = (text: string): boolean =>
	text.includes("brief summary of the post content");

/**
 * Pull post document fields from dynamic blocks so save writes the heading,
 * excerpt, and featured image the editor actually shows.
 */
export function collectPostFieldsFromBlocks(
	blocks: BlockConfig[],
): CollectedPostFields {
	const collected: CollectedPostFields = {};
	const stack: BlockConfig[] = [...blocks];
	while (stack.length > 0) {
		const block = stack.shift();
		if (!block) continue;
		const data = readBlockContentData(block.content);
		if (block.name === "post/title" && collected.title === undefined) {
			const text = typeof data.text === "string" ? data.text.trim() : "";
			if (text && !isDefaultTitle(text)) collected.title = text;
		}
		if (block.name === "post/excerpt" && collected.excerpt === undefined) {
			const text = typeof data.text === "string" ? data.text.trim() : "";
			if (text && !isDefaultExcerpt(text)) collected.excerpt = text;
		}
		if (
			block.name === "post/featured-image" &&
			collected.featuredImage === undefined
		) {
			const url = typeof data.url === "string" ? data.url.trim() : "";
			if (url) collected.featuredImage = url;
		}
		if (Array.isArray(block.children) && block.children.length > 0) {
			stack.unshift(...block.children);
		}
	}
	return collected;
}
