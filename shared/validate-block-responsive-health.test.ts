import { describe, expect, it } from "vitest";
import type { BlockConfig } from "./schema-types.js";
import { applyResponsiveHealthFixes, validateBlockResponsiveHealth } from "./validate-block-responsive-health.js";

const block = (overrides: Partial<BlockConfig>): BlockConfig =>
	({ id: "b1", name: "core/group", content: { kind: "text", value: "" }, styles: {}, ...overrides }) as BlockConfig;

const codes = (blocks: BlockConfig[]): string[] => validateBlockResponsiveHealth(blocks).issues.map((issue) => issue.code);

describe("wide fixed width check", () => {
	it("flags a fixed width wider than a phone, naming the block in plain words", () => {
		const { issues } = validateBlockResponsiveHealth([
			block({ id: "row", label: "Contact", styles: { width: "1080px" } }),
		]);
		expect(issues).toHaveLength(1);
		expect(issues[0]).toMatchObject({ code: "WIDE_FIXED_WIDTH", blockId: "row" });
		expect(issues[0]?.message).toContain('"Contact" is 1080px wide');
	});

	it("leaves narrow, fluid and already-capped widths alone", () => {
		expect(codes([block({ styles: { width: "320px" } })])).toEqual([]);
		expect(codes([block({ styles: { width: "100%", maxWidth: "1080px" } })])).toEqual([]);
		expect(codes([block({ styles: { width: "1080px", maxWidth: "100%" } })])).toEqual([]);
	});

	it("checks nested blocks too", () => {
		const tree = [block({ id: "outer", styles: { width: "100%" }, children: [block({ id: "inner", styles: { width: "900px" } })] })];
		expect(validateBlockResponsiveHealth(tree).issues.map((issue) => issue.blockId)).toEqual(["inner"]);
	});

	it("the one-click fix swaps the fixed width for a max width and clears the warning", () => {
		const tree = [
			block({ id: "outer", styles: { width: "100%" }, children: [block({ id: "inner", styles: { width: "900px", gap: "24px" } })] }),
		];
		const { blocks, fixedCount } = applyResponsiveHealthFixes(tree);
		expect(fixedCount).toBe(1);
		expect(blocks[0]?.children?.[0]?.styles).toEqual({ width: "100%", maxWidth: "900px", gap: "24px" });
		expect(blocks[0]).not.toBe(tree[0]);
		expect(codes(blocks)).toEqual([]);
		expect(tree[0]?.children?.[0]?.styles?.width).toBe("900px");
	});

	it("returns the same tree when there is nothing to fix", () => {
		const tree = [block({ styles: { width: "100%" } })];
		expect(applyResponsiveHealthFixes(tree)).toEqual({ blocks: tree, fixedCount: 0 });
	});
});
