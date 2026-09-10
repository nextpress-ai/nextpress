import { describe, expect, it } from "vitest";
import type { BlockConfig } from "./schema-types";
import {
	bindPostListBlock,
	bindPostListBlocks,
	postOverlayHash,
	readPostListContent,
	readPostOverlaySlug,
} from "./bind-post-list";

const listBlock = (data: Record<string, unknown> = {}): BlockConfig => ({
	id: "pl",
	name: "post/list",
	type: "block",
	parentId: null,
	content: { kind: "structured", data },
});

describe("bind-post-list", () => {
	it("defaults to grid layout and overlay details", () => {
		const content = readPostListContent(listBlock().content);
		expect(content.layout).toBe("grid");
		expect(content.openIn).toBe("overlay");
		expect(content.posts).toEqual([]);
	});

	it("keeps full-page open when set", () => {
		const content = readPostListContent(listBlock({ openIn: "page", layout: "cards" }).content);
		expect(content.openIn).toBe("page");
		expect(content.layout).toBe("cards");
	});

	it("stamps posts onto the block payload", () => {
		const posts = [
			{
				id: "1",
				title: "One",
				slug: "one",
				excerpt: "Hi",
				featuredImage: "",
				publishedAt: "2026-01-01",
				authorName: "Mira",
			},
		];
		const bound = bindPostListBlock({ block: listBlock(), posts });
		expect(readPostListContent(bound.content).posts).toEqual(posts);
	});

	it("rewrites nested post lists", () => {
		const tree: BlockConfig[] = [
			{
				id: "g",
				name: "core/group",
				type: "container",
				parentId: null,
				content: { kind: "structured", data: {} },
				children: [listBlock()],
			},
		];
		const bound = bindPostListBlocks({
			blocks: tree,
			resolvePosts: () => [
				{
					id: "2",
					title: "Nested",
					slug: "nested",
					excerpt: "",
					featuredImage: "",
					publishedAt: "",
					authorName: "",
				},
			],
		});
		const child = bound[0]?.children?.[0];
		expect(readPostListContent(child?.content).posts[0]?.slug).toBe("nested");
	});

	it("round-trips overlay hash slugs", () => {
		expect(postOverlayHash("field-notes")).toBe("#post/field-notes");
		expect(readPostOverlaySlug("#post/field-notes")).toBe("field-notes");
		expect(readPostOverlaySlug("#other")).toBe("");
	});
});
