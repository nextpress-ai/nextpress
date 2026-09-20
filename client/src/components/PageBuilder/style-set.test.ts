import { describe, expect, it } from "vitest";
import { anyStyleSet, anyTokenSet, isStyleValueSet } from "./style-set";

describe("isStyleValueSet", () => {
	it("treats empty, auto, none and initial as not set", () => {
		for (const value of [undefined, null, "", "  ", "auto", "none", "initial"]) {
			expect(isStyleValueSet({ value })).toBe(false);
		}
	});

	it("counts auto as set for spacing, where it centers", () => {
		expect(isStyleValueSet({ value: "auto", keepAuto: true })).toBe(true);
	});

	it("counts real values, including zero", () => {
		expect(isStyleValueSet({ value: "0" })).toBe(true);
		expect(isStyleValueSet({ value: "12px" })).toBe(true);
	});
});

describe("anyStyleSet / anyTokenSet", () => {
	it("looks across a list of keys", () => {
		expect(anyStyleSet({ styles: { width: "auto", height: "40px" }, keys: ["width", "height"] })).toBe(true);
		expect(anyStyleSet({ styles: { width: "auto" }, keys: ["width", "height"] })).toBe(false);
	});

	it("finds color entries, and hover ones separately", () => {
		const tokenMap = {
			color: { property: "color", value: "", variant: null, alias: "text", style: "#111" },
			"backgroundColor:hover": {
				property: "backgroundColor",
				value: "blue",
				variant: "500",
				alias: "bg",
				modifier: "hover",
				style: "#3b82f6",
			},
		};
		expect(anyTokenSet({ tokenMap, properties: ["color", "backgroundColor"] })).toBe(true);
		expect(anyTokenSet({ tokenMap, properties: ["color"], modifier: "hover" })).toBe(false);
		expect(anyTokenSet({ tokenMap, properties: ["backgroundColor"], modifier: "hover" })).toBe(true);
		expect(anyTokenSet({ tokenMap: undefined, properties: ["color"] })).toBe(false);
	});
});
