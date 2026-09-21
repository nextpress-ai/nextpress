import { describe, expect, it } from "vitest";
import type { TokenEntry } from "./schema-types";
import {
	BUTTON_SIZE_PRESETS,
	BUTTON_SIZE_STYLES,
	THEME_BUTTON_FILL,
	THEME_BUTTON_TEXT,
	buildButtonLookChange,
	buildButtonThemeChange,
	buttonFollowsTheme,
	buttonSizeStyles,
	customButtonSizeStyles,
	readButtonLook,
	readButtonSize,
} from "./button-look";

const token = (property: string, alias: string, style: string): TokenEntry => ({
	property,
	value: "blue",
	variant: "600",
	alias,
	style,
});

describe("readButtonSize", () => {
	it("reads the block's current default (16px text, 12px 24px padding) as LG, so nothing changes", () => {
		expect(readButtonSize({ fontSize: "16px", padding: "12px 24px" })).toBe("lg");
	});

	it("reads every preset back from its own styles", () => {
		for (const { value } of BUTTON_SIZE_PRESETS) {
			expect(readButtonSize(buttonSizeStyles(value))).toBe(value);
		}
	});

	it("says custom when the text size or the padding does not match a preset", () => {
		expect(readButtonSize({ fontSize: "19px", padding: "12px 24px" })).toBe("custom");
		expect(readButtonSize({ fontSize: "1rem", padding: "1rem 1rem" })).toBe("custom");
		expect(readButtonSize({})).toBe("custom");
		expect(readButtonSize(undefined)).toBe("custom");
	});

	it("sizes get bigger from SM to XL", () => {
		const sizes = BUTTON_SIZE_PRESETS.map(({ value }) => parseFloat(BUTTON_SIZE_STYLES[value].fontSize));
		expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
	});

	it("gives a custom text size padding that scales with it", () => {
		expect(customButtonSizeStyles("1.25rem")).toEqual({ fontSize: "1.25rem", padding: "0.75em 1.5em" });
		expect(readButtonSize(customButtonSizeStyles("1.25rem"))).toBe("custom");
	});
});

describe("readButtonLook", () => {
	it("is solid for a coloured, unset, or token-coloured background", () => {
		expect(readButtonLook({ styles: { backgroundColor: "#007cba" }, tokenMap: undefined })).toBe("solid");
		expect(readButtonLook({ styles: {}, tokenMap: undefined })).toBe("solid");
		expect(readButtonLook({ styles: { backgroundColor: "transparent" }, tokenMap: { backgroundColor: token("backgroundColor", "bg", "#2563eb") } })).toBe("solid");
	});

	it("is ghost when the background is clear", () => {
		expect(readButtonLook({ styles: { backgroundColor: "transparent" }, tokenMap: undefined })).toBe("ghost");
	});
});

describe("buildButtonLookChange", () => {
	it("solid to ghost: clear background, colour moves to text and a matching border", () => {
		const bg = token("backgroundColor", "bg", "#2563eb");
		const change = buildButtonLookChange({ look: "ghost", styles: { backgroundColor: "#2563eb", color: "#ffffff" }, tokenMap: { backgroundColor: bg } });
		expect(change.styles).toEqual({ backgroundColor: "transparent", color: "#2563eb", border: "1px solid currentColor" });
		expect(change.tokens.backgroundColor).toBeNull();
		expect(change.tokens.color).toEqual({ ...bg, property: "color", alias: "text" });
	});

	it("solid to ghost keeps a plain (non-token) colour and removes stale tokens", () => {
		const change = buildButtonLookChange({ look: "ghost", styles: { backgroundColor: "#007cba" }, tokenMap: {} });
		expect(change.styles.color).toBe("#007cba");
		expect(change.tokens).toEqual({ backgroundColor: null, color: null });
	});

	it("ghost to solid: the text colour becomes the background, text goes white, border goes", () => {
		const text = token("color", "text", "#16a34a");
		const change = buildButtonLookChange({ look: "solid", styles: { backgroundColor: "transparent", color: "#16a34a", border: "1px solid currentColor" }, tokenMap: { color: text } });
		expect(change.styles).toEqual({ backgroundColor: "#16a34a", color: "#ffffff", border: "none" });
		expect(change.tokens.color).toBeNull();
		expect(change.tokens.backgroundColor).toEqual({ ...text, property: "backgroundColor", alias: "bg" });
	});

	it("never turns a solid button white-on-white when the old text colour was white", () => {
		const change = buildButtonLookChange({ look: "solid", styles: { color: "#ffffff", backgroundColor: "transparent" }, tokenMap: {} });
		expect(change.styles.backgroundColor).toBe("#007cba");
	});

	it("round-trips a colour through ghost and back", () => {
		const bg = token("backgroundColor", "bg", "#2563eb");
		const toGhost = buildButtonLookChange({ look: "ghost", styles: { backgroundColor: "#2563eb" }, tokenMap: { backgroundColor: bg } });
		const back = buildButtonLookChange({ look: "solid", styles: toGhost.styles, tokenMap: toGhost.tokens });
		expect(back.styles.backgroundColor).toBe("#2563eb");
		expect(back.tokens.backgroundColor).toEqual(bg);
	});
});

describe("following the page theme", () => {
	it("gives a solid button the theme fill and the text that reads on it", () => {
		expect(buildButtonThemeChange({ property: "backgroundColor", look: "solid" })).toEqual({
			styles: { backgroundColor: THEME_BUTTON_FILL },
			tokens: { backgroundColor: null },
		});
		expect(buildButtonThemeChange({ property: "color", look: "solid" }).styles).toEqual({ color: THEME_BUTTON_TEXT });
	});

	it("a ghost button's text follows the accent itself", () => {
		expect(buildButtonThemeChange({ property: "color", look: "ghost" }).styles).toEqual({ color: THEME_BUTTON_FILL });
	});

	it("falls back to the old blue on a page with no theme", () => {
		expect(THEME_BUTTON_FILL).toBe("var(--npb-accent, #007cba)");
		expect(THEME_BUTTON_TEXT).toContain("#ffffff");
	});

	it("knows when a colour follows the theme, and that a token overrides it", () => {
		const styles = { backgroundColor: THEME_BUTTON_FILL, color: THEME_BUTTON_TEXT };
		expect(buttonFollowsTheme({ property: "backgroundColor", look: "solid", styles, tokenMap: undefined })).toBe(true);
		expect(buttonFollowsTheme({ property: "color", look: "solid", styles, tokenMap: undefined })).toBe(true);
		expect(buttonFollowsTheme({ property: "backgroundColor", look: "solid", styles: { backgroundColor: "#007cba" }, tokenMap: undefined })).toBe(false);
		expect(buttonFollowsTheme({ property: "backgroundColor", look: "solid", styles, tokenMap: { backgroundColor: token("backgroundColor", "bg", "#111") } })).toBe(false);
	});

	it("keeps the theme pair when switching a themed button between solid and ghost", () => {
		const ghost = buildButtonLookChange({ look: "ghost", styles: { backgroundColor: THEME_BUTTON_FILL, color: THEME_BUTTON_TEXT }, tokenMap: {} });
		expect(ghost.styles.color).toBe(THEME_BUTTON_FILL);
		const solid = buildButtonLookChange({ look: "solid", styles: ghost.styles, tokenMap: ghost.tokens });
		expect(solid.styles).toMatchObject({ backgroundColor: THEME_BUTTON_FILL, color: THEME_BUTTON_TEXT });
	});
});
