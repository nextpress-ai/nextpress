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
});
