/**
 * Shared sizing presets for blocks and page layout — prefer chips over freeform entry.
 */

export type DimensionPreset = {
	value: string;
	label: string;
};

export const WIDTH_PRESETS: readonly DimensionPreset[] = [
	{ value: "__auto__", label: "Auto" },
	{ value: "100%", label: "Fill" },
	{ value: "fit-content", label: "Fit" },
	{ value: "max-content", label: "Max" },
] as const;

export const MAX_WIDTH_PRESETS: readonly DimensionPreset[] = [
	{ value: "__none__", label: "None" },
	{ value: "640px", label: "SM" },
	{ value: "960px", label: "MD" },
	{ value: "1200px", label: "LG" },
	{ value: "1440px", label: "XL" },
	{ value: "100%", label: "Full" },
] as const;

export const MIN_HEIGHT_PRESETS: readonly DimensionPreset[] = [
	{ value: "__auto__", label: "Auto" },
	{ value: "10rem", label: "SM" },
	{ value: "20rem", label: "MD" },
	{ value: "32rem", label: "LG" },
	{ value: "100dvh", label: "Full" },
] as const;

export const HEIGHT_PRESETS: readonly DimensionPreset[] = [
	{ value: "__auto__", label: "Auto" },
	{ value: "min-content", label: "Min" },
	{ value: "max-content", label: "Max" },
	{ value: "50dvh", label: "Half" },
	{ value: "100dvh", label: "Full" },
] as const;

export const SPACING_PRESETS: readonly DimensionPreset[] = [
	{ value: "0", label: "0" },
	{ value: "0.25rem", label: "XS" },
	{ value: "0.5rem", label: "SM" },
	{ value: "1rem", label: "MD" },
	{ value: "1.5rem", label: "LG" },
	{ value: "2rem", label: "XL" },
] as const;

export const FONT_SIZE_PRESETS: readonly DimensionPreset[] = [
	{ value: "0.875rem", label: "SM" },
	{ value: "1rem", label: "Base" },
	{ value: "1.125rem", label: "LG" },
	{ value: "1.25rem", label: "XL" },
	{ value: "1.5rem", label: "2XL" },
	{ value: "2rem", label: "3XL" },
] as const;

export const BORDER_RADIUS_PRESETS: readonly DimensionPreset[] = [
	{ value: "0", label: "Square" },
	{ value: "0.25rem", label: "Subtle" },
	{ value: "0.375rem", label: "Rounded" },
	{ value: "0.75rem", label: "Soft" },
	{ value: "9999px", label: "Pill" },
	{ value: "50%", label: "Circle" },
] as const;

export const ASPECT_RATIO_PRESETS: readonly DimensionPreset[] = [
	{ value: "__auto__", label: "Auto" },
	{ value: "1 / 1", label: "1:1" },
	{ value: "4 / 3", label: "4:3" },
	{ value: "3 / 4", label: "3:4" },
	{ value: "16 / 9", label: "16:9" },
	{ value: "9 / 16", label: "9:16" },
	{ value: "21 / 9", label: "21:9" },
] as const;

/** Min column widths for auto-fit/auto-fill grid tracks (the RAM pattern). */
export const GRID_MIN_TRACK_WIDTH_PRESETS: readonly DimensionPreset[] = [
	{ value: "160px", label: "160" },
	{ value: "200px", label: "200" },
	{ value: "240px", label: "240" },
	{ value: "300px", label: "300" },
	{ value: "400px", label: "400" },
] as const;

/** CSS length units supported in numeric fields and validation hints. */
export const NPB_DIMENSION_UNITS = [
	"px",
	"rem",
	"em",
	"%",
	"vh",
	"vw",
	"dvh",
	"dvw",
	"svh",
	"ch",
] as const;

export type NpbDimensionUnit = (typeof NPB_DIMENSION_UNITS)[number];

export function isPresetValue(
	value: string | undefined,
	presets: readonly DimensionPreset[],
): boolean {
	if (!value) return false;
	return presets.some((preset) => preset.value === value);
}

export function resolvePresetCssValue(
	presetValue: string,
): string | undefined {
	if (presetValue === "__auto__" || presetValue === "__none__") {
		return undefined;
	}
	return presetValue;
}

export const FONT_WEIGHT_PRESETS: readonly DimensionPreset[] = [
	{ value: "300", label: "Light" },
	{ value: "normal", label: "Normal" },
	{ value: "500", label: "Medium" },
	{ value: "bold", label: "Bold" },
] as const;

/** Unitless multipliers — they scale with the font size, unlike `24px`. */
export const LINE_HEIGHT_PRESETS: readonly DimensionPreset[] = [
	{ value: "1.25", label: "Tight" },
	{ value: "1.5", label: "Normal" },
	{ value: "1.75", label: "Relaxed" },
	{ value: "2", label: "Loose" },
] as const;

/** What a preset field's custom group edits: a length (number + unit), or a plain box (numbers, text). */
export type CustomValueKind = "length" | "number" | "text";

const CSS_LENGTH = new RegExp(`^-?(\\d+\\.?\\d*|\\.\\d+)(${NPB_DIMENSION_UNITS.join("|")})$`, "i");

/** True for `0` or a number followed by a supported unit (`18px`, `1.2rem`, `50%`). */
export function isCssLength(value: string | undefined): boolean {
	const text = value?.trim() ?? "";
	return text === "0" || CSS_LENGTH.test(text);
}

/** Which preset (if any) a saved value equals. */
export function findPreset(
	value: string | undefined,
	presets: readonly DimensionPreset[],
): DimensionPreset | undefined {
	const text = value?.trim();
	if (!text) return undefined;
	return presets.find((preset) => preset.value === text);
}

/** Page shell padding on the left and right of the content column. */
export const PAGE_SIDE_PADDING_PRESETS: readonly DimensionPreset[] = [
	{ value: "0", label: "None" },
	{ value: "0.75rem", label: "Tight" },
	{ value: "1rem", label: "Normal" },
	{ value: "2rem", label: "Roomy" },
	{ value: "3rem", label: "Wide" },
] as const;

/** Page shell padding above and below the content column. */
export const PAGE_TOP_BOTTOM_PADDING_PRESETS: readonly DimensionPreset[] = [
	{ value: "0", label: "None" },
	{ value: "1rem", label: "Tight" },
	{ value: "2rem", label: "Normal" },
	{ value: "3rem", label: "Roomy" },
	{ value: "4rem", label: "Wide" },
] as const;
