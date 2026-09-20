import { describe, expect, it } from "vitest";
import {
	BORDER_RADIUS_PRESETS,
	FONT_WEIGHT_PRESETS,
	LINE_HEIGHT_PRESETS,
	findPreset,
	isCssLength,
} from "./dimension-presets";

describe("isCssLength", () => {
	it("accepts zero and number + known unit", () => {
		expect(isCssLength("0")).toBe(true);
		expect(isCssLength("0.95rem")).toBe(true);
		expect(isCssLength("50%")).toBe(true);
		expect(isCssLength(".5em")).toBe(true);
	});

	it("rejects words, bare numbers, and unknown units", () => {
		expect(isCssLength("big")).toBe(false);
		expect(isCssLength("14")).toBe(false);
		expect(isCssLength("14pt")).toBe(false);
		expect(isCssLength("")).toBe(false);
		expect(isCssLength(undefined)).toBe(false);
	});
});

describe("findPreset", () => {
	it("matches saved values to presets and treats anything else as custom", () => {
		expect(findPreset("9999px", BORDER_RADIUS_PRESETS)?.label).toBe("Pill");
		expect(findPreset(" 500 ", FONT_WEIGHT_PRESETS)?.label).toBe("Medium");
		expect(findPreset("1.5", LINE_HEIGHT_PRESETS)?.label).toBe("Normal");
		expect(findPreset("13px", BORDER_RADIUS_PRESETS)).toBeUndefined();
		expect(findPreset(undefined, BORDER_RADIUS_PRESETS)).toBeUndefined();
		expect(findPreset("", BORDER_RADIUS_PRESETS)).toBeUndefined();
	});
});
