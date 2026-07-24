import { describe, expect, it } from "vitest";
import { createNextpress } from "../create-nextpress.js";
import { patchBlockTree } from "./patch-block-tree.js";
import { buildBlockSchemaCatalog, validateBlockTree } from "./validate-block-tree.js";

const SITE_ID = "00000000-0000-4000-8000-000000000001";

describe("validateBlockTree", () => {
	const client = createNextpress({
		baseUrl: "https://cms.example.com",
		apiKey: "npk_live_test",
		siteId: SITE_ID,
	});

	it("accepts builder trees", () => {
		const blocks = [
			client.blocks.heading({ text: "Hi", level: 1 }),
			client.blocks.paragraph({ text: "Body" }),
		];
		const result = validateBlockTree(blocks);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.blockCount).toBe(2);
	});

	it("rejects unknown names", () => {
		const result = validateBlockTree([
			{
				id: "b1",
				name: "core/nope",
				type: "block",
				parentId: null,
				content: { kind: "text", value: "x" },
			},
		]);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.issues[0].code).toBe("UNKNOWN_BLOCK");
		}
	});
});

describe("patchBlockTree", () => {
	const client = createNextpress({
		baseUrl: "https://cms.example.com",
		apiKey: "npk_live_test",
		siteId: SITE_ID,
	});

	it("inserts, updates, moves, and deletes", () => {
		const heading = client.blocks.heading({ text: "A", level: 1 });
		const paragraph = client.blocks.paragraph({ text: "B" });
		const container = client.blocks.container({ children: [] });

		let tree = [heading, paragraph];

		const inserted = patchBlockTree({
			blocks: tree,
			ops: [{ op: "insert", parentId: null, index: 0, block: container }],
		});
		expect(inserted.ok).toBe(true);
		if (!inserted.ok) return;
		tree = inserted.blocks;
		expect(tree[0].id).toBe(container.id);

		const updated = patchBlockTree({
			blocks: tree,
			ops: [
				{
					op: "update",
					id: heading.id,
					set: { content: { kind: "text", value: "Updated", level: 2 } },
				},
			],
		});
		expect(updated.ok).toBe(true);
		if (!updated.ok) return;
		tree = updated.blocks;

		const moved = patchBlockTree({
			blocks: tree,
			ops: [{ op: "move", id: paragraph.id, parentId: container.id, index: 0 }],
		});
		expect(moved.ok).toBe(true);
		if (!moved.ok) return;
		tree = moved.blocks;
		expect(tree.find((b) => b.id === container.id)?.children?.[0]?.id).toBe(paragraph.id);

		const deleted = patchBlockTree({
			blocks: tree,
			ops: [{ op: "delete", id: heading.id }],
		});
		expect(deleted.ok).toBe(true);
		if (!deleted.ok) return;
		expect(deleted.summary.deleted).toEqual([heading.id]);
		expect(deleted.blocks.some((b) => b.id === heading.id)).toBe(false);
	});

	it("fails validation when inserting an unknown block", () => {
		const result = patchBlockTree({
			blocks: [],
			ops: [
				{
					op: "insert",
					parentId: null,
					block: {
						id: "bad",
						name: "core/imaginary",
						type: "block",
						parentId: null,
						content: { kind: "text", value: "x" },
					},
				},
			],
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("VALIDATION_FAILED");
		}
	});
});

describe("buildBlockSchemaCatalog", () => {
	it("lists registry blocks with allowsChildren", () => {
		const catalog = buildBlockSchemaCatalog();
		expect(catalog.version).toBe(1);
		expect(catalog.blocks.length).toBeGreaterThan(10);
		const container = catalog.blocks.find((b) => b.name === "core/container");
		expect(container?.allowsChildren).toBe(true);
		const heading = catalog.blocks.find((b) => b.name === "core/heading");
		expect(heading?.allowsChildren).toBe(false);
	});
});
