import { describe, expect, it } from "vitest";
import {
	DEFAULT_THEME_DESCRIPTION,
	DEFAULT_THEME_NAME,
	isLegacyDefaultThemeCopy,
	isSystemDefaultTheme,
	LEGACY_DEFAULT_THEME_DESCRIPTION,
	LEGACY_DEFAULT_THEME_NAME,
	resolveThemeDisplayCopy,
	SYSTEM_DEFAULT_THEME_OTHER,
} from "./theme-display.js";

describe("theme-display", () => {
	it("detects legacy default theme copy", () => {
		expect(
			isLegacyDefaultThemeCopy({
				name: LEGACY_DEFAULT_THEME_NAME,
				description: LEGACY_DEFAULT_THEME_DESCRIPTION,
			}),
		).toBe(true);
	});

	it("rewrites legacy default theme for admin UI", () => {
		expect(
			resolveThemeDisplayCopy({
				name: LEGACY_DEFAULT_THEME_NAME,
				description: LEGACY_DEFAULT_THEME_DESCRIPTION,
			}),
		).toEqual({
			name: DEFAULT_THEME_NAME,
			description: DEFAULT_THEME_DESCRIPTION,
		});
	});

	it("keeps custom theme names intact", () => {
		expect(
			resolveThemeDisplayCopy({
				name: "Ocean",
				description: "Cool blues for a calm site.",
			}),
		).toEqual({
			name: "Ocean",
			description: "Cool blues for a calm site.",
		});
	});

	it("marks the built-in Default theme as non-editable", () => {
		expect(
			isSystemDefaultTheme({
				name: DEFAULT_THEME_NAME,
				description: DEFAULT_THEME_DESCRIPTION,
			}),
		).toBe(true);
		expect(
			isSystemDefaultTheme({
				name: "Ocean",
				description: "Custom",
				other: SYSTEM_DEFAULT_THEME_OTHER,
			}),
		).toBe(true);
		expect(isSystemDefaultTheme({ name: "Ocean", description: "Custom" })).toBe(false);
	});
});
