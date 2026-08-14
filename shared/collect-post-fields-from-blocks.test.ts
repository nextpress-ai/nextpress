import { describe, expect, it } from "vitest";
import { collectPostFieldsFromBlocks } from "./collect-post-fields-from-blocks.js";
import type { BlockConfig } from "./schema-types.js";

const structured = (
	name: string,
	data: Record<string, unknown>,
): BlockConfig =>
	({
		id: name,
		name,
		type: "block",
		parentId: null,
		content: { kind: "structured", data },
	}) as BlockConfig;

describe("collectPostFieldsFromBlocks", () => {
	it("copies title, excerpt, and featured image from post blocks", () => {
		const collected = collectPostFieldsFromBlocks([
			structured("post/title", { text: "First headline" }),
			structured("post/excerpt", { text: "A custom excerpt for readers" }),
			structured("post/featured-image", { url: "https://cdn.example/hero.jpg" }),
		]);
		expect(collected).toEqual({
			title: "First headline",
			excerpt: "A custom excerpt for readers",
			featuredImage: "https://cdn.example/hero.jpg",
		});
	});

	it("skips default placeholder copy", () => {
		const collected = collectPostFieldsFromBlocks([
			structured("post/title", { text: "Post Title" }),
			structured("post/excerpt", {
				text: "This is a brief summary of the post content that gives readers a preview of what to expect...",
			}),
			structured("post/featured-image", { url: "" }),
		]);
		expect(collected).toEqual({});
	});

	it("walks nested children", () => {
		const collected = collectPostFieldsFromBlocks([
			{
				id: "cols",
				name: "core/columns",
				type: "container",
				parentId: null,
				children: [structured("post/title", { text: "Nested title" })],
			} as BlockConfig,
		]);
		expect(collected.title).toBe("Nested title");
	});
});
