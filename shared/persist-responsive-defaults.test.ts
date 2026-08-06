import { describe, expect, it } from "vitest";
import { legacyFixedWidthFixture } from "./test/fixtures/responsive/fixtures.js";
import { persistResponsiveDefaultsToBlocks } from "./persist-responsive-defaults.js";
import { validateBlockResponsiveHealth } from "./validate-block-responsive-health.js";

describe("persistResponsiveDefaultsToBlocks", () => {
	it("adds maxWidth to legacy fixed-width images", () => {
		const { blocks, changedCount } = persistResponsiveDefaultsToBlocks({
			blocks: legacyFixedWidthFixture,
		});

		expect(changedCount).toBe(1);
		expect(blocks[0]?.styles?.maxWidth).toBe("100%");
	});

	it("is idempotent on second run", () => {
		const first = persistResponsiveDefaultsToBlocks({ blocks: legacyFixedWidthFixture });
		const second = persistResponsiveDefaultsToBlocks({ blocks: first.blocks });
		expect(second.changedCount).toBe(0);
	});

	it("clears IMAGE_FIXED_WIDTH health warning after persist", () => {
		const before = validateBlockResponsiveHealth(legacyFixedWidthFixture);
		expect(before.issues.some((i) => i.code === "IMAGE_FIXED_WIDTH")).toBe(true);

		const { blocks } = persistResponsiveDefaultsToBlocks({ blocks: legacyFixedWidthFixture });
		const after = validateBlockResponsiveHealth(blocks);
		expect(after.issues.some((i) => i.code === "IMAGE_FIXED_WIDTH")).toBe(false);
	});
});
