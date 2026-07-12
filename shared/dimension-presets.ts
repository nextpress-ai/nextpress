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
