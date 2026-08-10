import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import {
	readColumnLayoutFromBlock,
	readColumnsData,
	writeColumnsData,
} from "@shared/columns-layout";

describe("readColumnLayoutFromBlock", () => {
	it("preserves structured semantic metadata and columnLayout", () => {
		const columnLayout = [
			{
				columnId: "col-1",
				width: "50%",
				blockIds: ["heading-1"],
				label: "Primary",
			},
		];
		const content = {
			kind: "structured" as const,
			data: {
				layoutMode: "flex" as const,
				columnLayout,
				semanticRole: "feature-grid",
				customData: { source: "legacy-import" },
			},
		};

		expect(readColumnsData(content)).toEqual(content.data);
		expect(
			writeColumnsData(content, { gap: "24px" }),
		).toEqual({
			kind: "structured",
			data: {
				...content.data,
				gap: "24px",
			},
		});
	});

	it("reads columnLayout from settings, not content", () => {
		const block: BlockConfig = {
			id: "columns-1",
			name: "core/columns",
			type: "container",
			parentId: null,
			content: { kind: "structured", data: { direction: "row", gap: "20px" } },
			settings: {
				columnLayout: [
					{ columnId: "col-1", width: "100%", blockIds: ["heading-1", "text-1"] },
				],
			},
			children: [
				{ id: "heading-1", name: "core/heading", type: "block", parentId: "columns-1", content: { kind: "text", value: "Title" } },
				{ id: "text-1", name: "core/paragraph", type: "block", parentId: "columns-1", content: { kind: "text", value: "Body" } },
				{ id: "button-1", name: "core/button", type: "block", parentId: "columns-1", content: { kind: "structured", data: {} } },
			],
		};

		const layout = readColumnLayoutFromBlock(block);
		expect(layout).toHaveLength(1);
		expect(layout[0]?.blockIds).toEqual(["heading-1", "text-1", "button-1"]);
	});

	it("defaults to one full-width column with all children", () => {
		const block: BlockConfig = {
			id: "columns-2",
			name: "core/columns",
			type: "container",
			parentId: null,
			content: { kind: "structured", data: { direction: "row" } },
			children: [
				{ id: "a", name: "core/heading", type: "block", parentId: "columns-2", content: { kind: "text", value: "A" } },
				{ id: "b", name: "core/paragraph", type: "block", parentId: "columns-2", content: { kind: "text", value: "B" } },
			],
		};

		const layout = readColumnLayoutFromBlock(block);
		expect(layout).toEqual([
			{ columnId: "default-col-1", width: "100%", blockIds: ["a", "b"] },
		]);
	});
});
