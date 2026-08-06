import { describe, expect, it } from "vitest";
import type { TokenEntry } from "./schema-types.js";
import { resolveTokenMapForSSR } from "./token-resolution.js";

describe("resolveTokenMapForSSR", () => {
	it("resolves theme color tokens from entry.value", () => {
		const tokenMap: Record<string, TokenEntry> = {
			bg: {
				property: "backgroundColor",
				value: "red",
				variant: "500",
				alias: "bg",
			},
		};

		const { style } = resolveTokenMapForSSR("block-1", tokenMap, {});
		expect(style.backgroundColor).toBe("#ef4444");
	});

	it("resolves custom numeric values with units", () => {
		const tokenMap: Record<string, TokenEntry> = {
			pt: {
				property: "paddingTop",
				value: "",
				variant: null,
				alias: "pt",
				style: "16",
				unitCategory: "spacing",
			},
		};

		const { style } = resolveTokenMapForSSR("block-1", tokenMap, { spacing: "px" });
		expect(style.paddingTop).toBe("16px");
	});

	it("emits modifier CSS for hover theme tokens", () => {
		const tokenMap: Record<string, TokenEntry> = {
			bg: {
				property: "backgroundColor",
				value: "blue",
				variant: "500",
				alias: "bg",
				modifier: "hover",
			},
		};

		const { modifierCSS } = resolveTokenMapForSSR("block-1", tokenMap, {});
		expect(modifierCSS).toContain(":hover");
		expect(modifierCSS).toContain("background-color");
	});
});
