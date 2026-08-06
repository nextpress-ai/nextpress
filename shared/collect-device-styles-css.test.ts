import { describe, expect, it } from "vitest";
import {
	collectBlockDeviceStylesCSS,
	collectDeviceStylesCSS,
} from "./collect-device-styles-css.js";
import type { BlockConfig } from "./schema-types.js";

const blockWithDeviceStyles = (): BlockConfig =>
	({
		id: "abc123",
		name: "core/paragraph",
		other: {
			deviceStyles: {
				mobile: { padding: "8px", fontSize: "14px" },
				tablet: { padding: "12px" },
			},
		},
	}) as BlockConfig;

describe("collectDeviceStylesCSS", () => {
	it("emits mobile and tablet @media rules for a block", () => {
		const css = collectBlockDeviceStylesCSS(blockWithDeviceStyles());
		expect(css).toContain("@media (max-width: 767px)");
		expect(css).toContain(".block-abc123");
		expect(css).toContain("padding: 8px");
		expect(css).toContain("@media (min-width: 768px) and (max-width: 1023px)");
		expect(css).toContain("padding: 12px");
	});

	it("walks nested children in the block tree", () => {
		const css = collectDeviceStylesCSS([
			{
				id: "parent",
				name: "core/container",
				children: [blockWithDeviceStyles()],
			} as BlockConfig,
		]);
		expect(css).toContain("padding: 8px");
	});

	it("returns empty string when no device overrides exist", () => {
		expect(collectDeviceStylesCSS([{ id: "x", name: "core/heading" } as BlockConfig])).toBe("");
	});
});
