import { describe, expect, it } from "vitest";
import {
	bindPostBlocks,
	bindablePostFromRecord,
	nestBoundComments,
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
		comments: [] as { id: string; author: string; date: string; content: string; replies: never[] }[],
		adjacent: { prev: { id: "p0", title: "Older", slug: "older" }, next: null },
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
			data: { postId: "post-1", showForm: true, comments: [] },
		});
		expect(children[3]?.content).toMatchObject({
			kind: "structured",
			data: {
				postId: "post-1",
				showLabel: true,
				prev: { slug: "older" },
				next: null,
			},
		});
	});

	it("keeps explicit author box custom fields over the profile", () => {
		const bound = bindPostBlocks({
			blocks: [
				block("post/author-box", {
					name: "Staff Writer",
					bio: "Writes the newsletter.",
				}),
			],
			post,
		});

		expect(bound[0]?.content).toMatchObject({
			kind: "structured",
			data: {
				name: "Staff Writer",
				avatar: "/me.png",
				bio: "Writes the newsletter.",
				postId: "post-1",
				authorId: "user-1",
			},
		});
	});

	it("fills only the author box gaps from the profile", () => {
		const bound = bindPostBlocks({
			blocks: [
				block("post/author-box", {
					name: "Guest Author",
					avatar: "",
				}),
			],
			post: {
				...post,
				author: { name: "Hussein", avatar: "/me.png", bio: "Writes things." },
			},
		});

		expect(bound[0]?.content).toMatchObject({
			kind: "structured",
			data: {
				name: "Guest Author",
				avatar: "/me.png",
				bio: "Writes things.",
			},
		});
	});

	it("injects bound comments into the comments block", () => {
		const bound = bindPostBlocks({
			blocks: [block("post/comments", { showForm: false })],
			post: {
				...post,
				comments: [
					{
						id: "c1",
						author: "Ada",
						date: "2026-01-01",
						content: "Nice post",
						replies: [],
					},
				],
			},
		});
		expect(bound[0]?.content).toMatchObject({
			kind: "structured",
			data: {
				postId: "post-1",
				showForm: false,
				comments: [{ id: "c1", author: "Ada", content: "Nice post" }],
			},
		});
	});
});

describe("nestBoundComments", () => {
	it("nests replies under their parent", () => {
		const nested = nestBoundComments([
			{ id: "a", parentId: null, authorName: "Ada", content: "Hi", createdAt: "2026-01-01" },
			{ id: "b", parentId: "a", authorName: "Bob", content: "Hello", createdAt: "2026-01-02" },
		]);
		expect(nested).toHaveLength(1);
		expect(nested[0]?.author).toBe("Ada");
		expect(nested[0]?.replies[0]?.author).toBe("Bob");
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
