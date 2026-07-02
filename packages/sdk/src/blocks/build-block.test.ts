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
		const block = blocks.postList({ data: { blogId: "blog-1", postsPerPage: 10 } });
		expect(block.name).toBe("post/list");
		expect(block.content).toMatchObject({
			kind: "structured",
			data: expect.objectContaining({ blogId: "blog-1", postsPerPage: 10 }),
		});
	});

	it("validates block names", () => {
		expect(isBlockName("core/heading")).toBe(true);
		expect(isBlockName("unknown/block")).toBe(false);
	});
});
