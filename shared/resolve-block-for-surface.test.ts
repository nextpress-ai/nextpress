import { describe, expect, it } from "vitest";
import { resolveBlockForSurface } from "./resolve-block-for-surface.js";
import {
	legacyFixedWidthFixture,
	contentStressFixture,
	layoutStressFixture,
	typographyStressFixture,
} from "./test/fixtures/responsive/fixtures.js";
import { validateBlockResponsiveHealth } from "./validate-block-responsive-health.js";

const topLevelBlocks = (blocks: typeof contentStressFixture) => blocks;

describe("resolveBlockForSurface", () => {
	it("applies max-width 100% to legacy fixed-width images on publish", () => {
		const block = legacyFixedWidthFixture[0];
		const canvas = resolveBlockForSurface({ block, surface: "canvas", deviceView: "desktop" });
		const publish = resolveBlockForSurface({ block, surface: "publish" });

		expect(publish.inlineStyles.maxWidth).toBe("100%");
		expect(canvas.inlineStyles.maxWidth).toBe("100%");
		expect(publish.warnings.some((w) => w.code === "FIXED_WIDE_IMAGE")).toBe(true);
	});

	it("adds is-stacked-on-mobile class for media-text when default true", () => {
		const block = contentStressFixture.find((b) => b.name === "core/media-text")!;
		const resolved = resolveBlockForSurface({ block, surface: "publish" });
		expect(resolved.classNames).toContain("is-stacked-on-mobile");
	});

	it("canvas and publish produce same classNames for media-text", () => {
		const block = contentStressFixture.find((b) => b.name === "core/media-text")!;
		const canvas = resolveBlockForSurface({ block, surface: "canvas", deviceView: "desktop" });
		const publish = resolveBlockForSurface({ block, surface: "publish" });
		expect(canvas.classNames).toEqual(publish.classNames);
	});

	it("emits deviceStyles CSS fragments on publish surface", () => {
		const block = {
			...legacyFixedWidthFixture[0],
			other: {
				...legacyFixedWidthFixture[0].other,
				deviceStyles: { mobile: { padding: "8px" } },
			},
		};
		const resolved = resolveBlockForSurface({ block, surface: "publish" });
		expect(resolved.cssFragments.join("\n")).toContain("@media (max-width: 767px)");
		expect(resolved.cssFragments.join("\n")).toContain("padding: 8px");
	});
});

describe("responsive parity (canvas vs publish)", () => {
	it("matches classNames for all blocks in content stress fixture at desktop tier", () => {
		for (const block of topLevelBlocks(contentStressFixture)) {
			const canvas = resolveBlockForSurface({ block, surface: "canvas", deviceView: "desktop" });
			const publish = resolveBlockForSurface({ block, surface: "publish" });
			expect(canvas.classNames).toEqual(publish.classNames);
		}
	});

	it("matches classNames for layout and typography stress top-level blocks", () => {
		for (const block of [...layoutStressFixture, ...typographyStressFixture]) {
			const canvas = resolveBlockForSurface({ block, surface: "canvas", deviceView: "desktop" });
			const publish = resolveBlockForSurface({ block, surface: "publish" });
			expect(canvas.classNames).toEqual(publish.classNames);
		}
	});
});

describe("validateBlockResponsiveHealth", () => {
	it("warns on fixed-width images without maxWidth in raw block", () => {
		const result = validateBlockResponsiveHealth(legacyFixedWidthFixture);
		expect(result.ok).toBe(false);
		expect(result.issues.some((i) => i.code === "IMAGE_FIXED_WIDTH")).toBe(true);
	});
});
