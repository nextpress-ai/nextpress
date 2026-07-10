import { describe, expect, it } from "vitest";
import { BLOCK_DEFINITIONS, BLOCK_NAMES, isBlockName } from "./block-definitions.js";
import { createBlocksBuilder } from "./build-block.js";

describe("createBlocksBuilder", () => {
	const blocks = createBlocksBuilder();

	it("registers every dashboard block name", () => {
		expect(blocks.names).toEqual(BLOCK_NAMES);
		expect(Object.keys(BLOCK_DEFINITIONS)).toHaveLength(BLOCK_NAMES.length);
	});

	it("builds a heading block", () => {
		const block = blocks.heading({ text: "Hello", level: 1 });
		expect(block.name).toBe("core/heading");
		expect(block.content).toEqual({ kind: "text", value: "Hello", level: 1 });
	});

	it("builds any registered block via fromName", () => {
		for (const name of BLOCK_NAMES) {
			const block = blocks.fromName(name);
			expect(block.name).toBe(name);
			expect(block.id).toBeTruthy();
		}
	});

	it("builds post list block with blog defaults", () => {
		const block = blocks.postList({
			settings: { content: { blogId: "blog-1", postsPerPage: 10 } },
		});
		expect(block.name).toBe("post/list");
		expect(block.content).toMatchObject({
			kind: "structured",
			data: expect.objectContaining({ blogId: "blog-1", postsPerPage: 10 }),
		});
	});

	it("builds group block with layout on styles only", () => {
		const block = blocks.group({
			settings: {
				content: { tagName: "div" },
				styles: { display: "flex", flexDirection: "row", gap: "8px", padding: "12px", backgroundColor: "#fff" },
			},
		});
		expect(block.content).toMatchObject({
			kind: "structured",
			data: expect.objectContaining({ tagName: "div" }),
		});
		const data = (block.content as { data: Record<string, unknown> }).data;
		expect(data.flexDirection).toBeUndefined();
		expect(data.display).toBeUndefined();
		expect(data.gap).toBeUndefined();
		expect(block.styles).toMatchObject({
			display: "flex",
			flexDirection: "row",
			gap: "8px",
			padding: "12px",
			backgroundColor: "#fff",
		});
	});

	it("assigns parentId on nested children", () => {
		const block = blocks.group({
			settings: { content: { tagName: "div" } },
			children: [blocks.paragraph({ settings: { content: { text: "Child" } } })],
		});
		expect(block.children?.[0]?.parentId).toBe(block.id);
	});

	it("validates block names", () => {
		expect(isBlockName("core/heading")).toBe(true);
		expect(isBlockName("unknown/block")).toBe(false);
	});

	it("builds icon blocks with lucide metadata", () => {
		const block = blocks.icon({
			settings: {
				content: { icon: { iconName: "search", iconSet: "lucide" }, label: "Search" },
				styles: { color: "#4285f4", width: "20px", height: "20px" },
			},
		});
		expect(block.name).toBe("core/icon");
		expect(block.content).toMatchObject({
			kind: "structured",
			data: {
				icon: expect.objectContaining({
					iconSet: "lucide",
					iconName: "search",
				}),
				label: "Search",
			},
		});
		expect(block.styles?.color).toBe("#4285f4");
	});

	it("builds button blocks with text content shape", () => {
		const block = blocks.button({
			settings: {
				content: {
					text: "Google Search",
					url: "https://www.google.com",
					linkTarget: "_blank",
				},
			},
		});
		expect(block.name).toBe("core/button");
		expect(block.content).toEqual({
			kind: "text",
			value: "Google Search",
			url: "https://www.google.com",
			linkTarget: "_blank",
		});
	});
});
