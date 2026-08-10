import { describe, expect, it } from "vitest";
import { stripVisualContentFromBlock } from "@shared/strip-visual-content-from-blocks";
import type { BlockConfig } from "@shared/schema-types";

describe("stripVisualContentFromBlock", () => {
	it("removes group layout keys from structured content", () => {
		const block: BlockConfig = {
			id: "g1",
			name: "core/group",
			type: "container",
			parentId: null,
			content: {
				kind: "structured",
				data: {
					tagName: "div",
					display: "flex",
					flexDirection: "row",
					gap: "8px",
				},
			},
			styles: { display: "flex", flexDirection: "row", gap: "8px" },
		};
		const next = stripVisualContentFromBlock(block);
		const data = (next.content as { data: Record<string, unknown> }).data;
		expect(data.tagName).toBe("div");
		expect(data.display).toBeUndefined();
		expect(data.flexDirection).toBeUndefined();
		expect(data.gap).toBeUndefined();
	});

	it("preserves columns semantic metadata while stripping visual fields", () => {
		const block: BlockConfig = {
			id: "columns-1",
			name: "core/columns",
			type: "container",
			parentId: null,
			content: {
				kind: "structured",
				data: {
					layoutMode: "flex",
					gap: "16px",
					direction: "row",
					semanticRole: "feature-grid",
					columnLayout: [
						{
							columnId: "default-col-1",
							blockIds: ["child-1"],
							label: "Primary",
						},
					],
				},
			},
		};

		const next = stripVisualContentFromBlock(block);
		const data = (next.content as { data: Record<string, unknown> }).data;
		expect(data.gap).toBeUndefined();
		expect(data.direction).toBeUndefined();
		expect(data.semanticRole).toBe("feature-grid");
		expect(data.columnLayout).toEqual([
			{
				columnId: "default-col-1",
				blockIds: ["child-1"],
				label: "Primary",
			},
		]);
	});
});
