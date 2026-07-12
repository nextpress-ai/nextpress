import { describe, expect, it } from "vitest";
import { createBlocksBuilder } from "../blocks/build-block.js";
import { mergePageOtherOnWrite } from "../types/page-other.js";
import { buildColumnsLayout } from "../layout/columns-layout.js";

describe("SDK page and block defaults", () => {
	const blocks = createBlocksBuilder();

	it("applies editor shell padding and token units on blocks", () => {
		const block = blocks.paragraph({ text: "Hello" });
		expect(block.styles?.padding).toBe("20px");
		expect(block.styles?.margin).toBe("0px");
		expect(block.other?.units).toMatchObject({
			spacing: "px",
			font: "rem",
		});
	});

	it("applies heading registry defaultStyles", () => {
		const block = blocks.heading({ text: "Title", level: 1 });
		expect(block.styles?.fontWeight).toBe("700");
		expect(block.styles?.margin).toBe("1rem 0");
	});

	it("merges page.other design defaults like dashboard create", () => {
		const other = mergePageOtherOnWrite({}, "create").other;
		expect(other.design).toEqual({
			fontFamily: "system-ui",
			containerWidth: "1200px",
			padding: "2rem 1rem",
		});
		expect(other.icons).toEqual({
			defaultSet: "lucide",
			defaultSize: 24,
		});
	});

	it("builds columns with columnLayout for multi-column preview", () => {
		const col1 = blocks.paragraph({ text: "One" });
		const col2 = blocks.paragraph({ text: "Two" });
		const col3 = blocks.paragraph({ text: "Three" });

		const columns = blocks.columns({
			columnCount: 3,
			settings: { styles: { gap: "24px" } },
			children: [col1, col2, col3],
		});

		const layout = columns.settings?.columnLayout as { blockIds: string[] }[];
		expect(layout).toHaveLength(3);
		expect(layout.flatMap((col) => col.blockIds)).toEqual([col1.id, col2.id, col3.id]);
		expect(columns.styles?.gap).toBe("24px");
	});

	it("supports explicit columnGroups", () => {
		const left = blocks.heading({ text: "Left", level: 3 });
		const right = blocks.paragraph({ text: "Right" });
		const columns = blocks.columns({
			columnGroups: [[left], [right]],
		});
		const layout = columns.settings?.columnLayout as { blockIds: string[] }[];
		expect(layout).toHaveLength(2);
		expect(layout[0]?.blockIds).toEqual([left.id]);
		expect(layout[1]?.blockIds).toEqual([right.id]);
	});
});

describe("buildColumnsLayout", () => {
	it("distributes children round-robin", () => {
		const blocks = createBlocksBuilder();
		const children = [
			blocks.paragraph({ text: "a" }),
			blocks.paragraph({ text: "b" }),
			blocks.paragraph({ text: "c" }),
		];
		const layout = buildColumnsLayout(2, children);
		expect(layout[0]?.blockIds).toEqual([children[0]!.id, children[2]!.id]);
		expect(layout[1]?.blockIds).toEqual([children[1]!.id]);
	});
});
