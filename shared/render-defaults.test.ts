import { describe, expect, it } from "vitest";
import { applyResponsiveDefaults } from "./render-defaults.js";
import { legacyFixedWidthFixture } from "./test/fixtures/responsive/fixtures.js";

describe("applyResponsiveDefaults", () => {
	it("sets container width and mobile padding tier", () => {
		const block = {
			id: "c1",
			name: "core/container",
			styles: { padding: "24px" },
		};
		const { styles } = applyResponsiveDefaults({ block: block as never, tier: "mobile" });
		expect(styles.width).toBe("100%");
		expect(styles.maxWidth).toBe("100%");
		expect(styles.padding).toBe("16px");
	});

	it("warns and caps wide images", () => {
		const block = legacyFixedWidthFixture[0];
		const { styles, warnings } = applyResponsiveDefaults({ block, tier: "large" });
		expect(styles.maxWidth).toBe("100%");
		expect(warnings.some((w) => w.code === "FIXED_WIDE_IMAGE")).toBe(true);
	});

	it("adds stacked class for media-text by default", () => {
		const { classNames } = applyResponsiveDefaults({
			block: {
				id: "mt1",
				name: "core/media-text",
				content: { kind: "structured", data: { isStackedOnMobile: true } },
			} as never,
			tier: "large",
		});
		expect(classNames).toContain("is-stacked-on-mobile");
	});

	it("enforces touch target and form font on interactive blocks", () => {
		const button = applyResponsiveDefaults({
			block: { id: "b1", name: "core/button", styles: {} } as never,
			tier: "mobile",
		});
		expect(button.styles.minHeight).toBe("44px");
		expect(button.styles.fontSize).toBe("16px");

		const input = applyResponsiveDefaults({
			block: { id: "i1", name: "core/input", styles: {} } as never,
			tier: "mobile",
		});
		expect(input.styles.width).toBe("100%");
		expect(input.styles.fontSize).toBe("16px");
	});
});
