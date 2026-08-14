import { describe, expect, it } from "vitest";
import {
	bindPostBlocks,
	bindablePostFromRecord,
} from "./bind-post-blocks.js";
import type { BlockConfig } from "./schema-types.js";

const block = (
	name: string,
	data: Record<string, unknown>,
	children?: BlockConfig[],
): BlockConfig =>
	({
		id: name,
		name,
		type: "block",
		parentId: null,
		content: { kind: "structured", data },
		...(children ? { children, type: "container" } : {}),
	}) as BlockConfig;

describe("bindPostBlocks", () => {
	const post = {
		id: "post-1",
		authorId: "user-1",
		title: "First Post",
		excerpt: "A short summary",
		featuredImage: "https://cdn.example/hero.jpg",
		publishedAt: "2026-01-02T00:00:00.000Z",
		categories: ["News"],
		tags: ["launch"],
		author: { name: "Hussein", avatar: "/me.png", bio: "Writes things." },
	};

	it("rewrites title, excerpt, and featured image to public content kinds", () => {
		const bound = bindPostBlocks({
			blocks: [
				block("post/title", { text: "First headline", tag: "h1" }),
				block("post/excerpt", { text: "Custom excerpt" }),
				block("post/featured-image", { url: "" }),
			],
			post,
		});

		expect(bound[0]?.content).toMatchObject({
			kind: "text",
			value: "First headline",
			level: 1,
		});
		expect(bound[1]?.content).toMatchObject({
			kind: "text",
			value: "Custom excerpt",
		});
		expect(bound[2]?.content).toMatchObject({
			kind: "media",
			url: "https://cdn.example/hero.jpg",
			mediaType: "image",
		});
	});

	it("falls back to the post document when block text is empty", () => {
		const bound = bindPostBlocks({
			blocks: [block("post/title", { text: "", tag: "h2" })],
			post,
		});
		expect(bound[0]?.content).toMatchObject({
			kind: "text",
			value: "First Post",
			level: 2,
		});
	});

	it("injects author fields and post id into nested post blocks", () => {
		const bound = bindPostBlocks({
			blocks: [
				{
					id: "cols",
					name: "core/columns",
					type: "container",
					parentId: null,
					children: [
						block("post/author-box", { authorId: "" }),
						block("post/info", { showDate: true }),
						block("post/comments", { showForm: true }),
						block("post/navigation", { showLabel: true }),
					],
				} as BlockConfig,
			],
			post,
		});

		const children = bound[0]?.children ?? [];
		expect(children[0]?.content).toMatchObject({
			kind: "structured",
			data: {
				name: "Hussein",
				avatar: "/me.png",
				bio: "Writes things.",
				postId: "post-1",
				authorId: "user-1",
			},
		});
		expect(children[1]?.content).toMatchObject({
			kind: "structured",
			data: {
				publishedAt: "2026-01-02T00:00:00.000Z",
				categories: ["News"],
				tags: ["launch"],
				postId: "post-1",
			},
		});
		expect(children[2]?.content).toMatchObject({
			kind: "structured",
			data: { postId: "post-1", showForm: true },
		});
		expect(children[3]?.content).toMatchObject({
			kind: "structured",
			data: { postId: "post-1", showLabel: true },
		});
	});
});

describe("bindablePostFromRecord", () => {
	it("reads categories and tags from other when top-level is missing", () => {
		const post = bindablePostFromRecord({
			id: "p1",
			other: { categories: ["Guides"], tags: ["cms"] },
		});
		expect(post.categories).toEqual(["Guides"]);
		expect(post.tags).toEqual(["cms"]);
	});
});
