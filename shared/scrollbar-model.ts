import type { TokenEntry } from "./schema-types.js";
import { safeCssColor, safePxLength } from "./css-safe.js";

export const SCROLLBAR_LOOK_OPTIONS = [
	{ value: "default", label: "Standard" },
	{ value: "custom", label: "Custom" },
	{ value: "hidden", label: "Hidden" },
] as const;

export type ScrollbarLook = (typeof SCROLLBAR_LOOK_OPTIONS)[number]["value"];

/** Named widths for the scrollbar's track, in pixels. */
export const SCROLLBAR_WIDTH_PRESETS = [
	{ value: "6px", label: "Thin" },
	{ value: "10px", label: "Medium" },
	{ value: "14px", label: "Wide" },
] as const;

/** How a page's scrollbar looks. Missing or `default` is a normal bar, a little smaller, with square corners. */
export type ScrollbarSettings = {
	look?: ScrollbarLook;
	/** Whole pixels, e.g. "10px". Browsers that only allow thin / normal round to the nearest. */
	width?: string;
	rounded?: boolean;
	thumbColor?: TokenEntry;
	trackColor?: TokenEntry;
	/** Thumb colour while the pointer is over it. Follows the thumb when missing. */
	hoverColor?: TokenEntry;
};

export const SCROLLBAR_DEFAULTS = {
	width: "10px",
	thumb: "#94a3b8",
	hover: "#64748b",
	track: "transparent",
} as const;

const THIN_LIMIT_PX = 8;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const readColorEntry = (value: unknown): TokenEntry | undefined => {
	if (!isRecord(value)) return undefined;
	if (typeof value.property !== "string" || typeof value.alias !== "string") return undefined;
	return value as unknown as TokenEntry;
};

/** Reads saved scrollbar settings, dropping anything that is not a known look, safe size or colour. */
export function readScrollbarSettings(raw: unknown): ScrollbarSettings | undefined {
	if (!isRecord(raw)) return undefined;
	const look = SCROLLBAR_LOOK_OPTIONS.find((option) => option.value === raw.look)?.value;
	if (!look) return undefined;
	// Standard keeps none of the custom size or colours, so they cannot leak back onto the bar.
	if (look === "default") return { look: "default" };
	return {
		look,
		width: safePxLength(raw.width),
		rounded: typeof raw.rounded === "boolean" ? raw.rounded : undefined,
		thumbColor: readColorEntry(raw.thumbColor),
		trackColor: readColorEntry(raw.trackColor),
		hoverColor: readColorEntry(raw.hoverColor),
	};
}

const entryColor = (entry: TokenEntry | undefined, fallback: string): string =>
	safeCssColor(entry?.style) ?? fallback;

/**
 * A normal bar is about 16px and often pill-shaped. Standard is a step under that, with square
 * corners. Pixel size and square corners only exist on the engine scrollbar, so Standard paints
 * that and leaves other browsers on their own normal bar (`thin` is a different, skinny look).
 */
const STANDARD_BAR = {
	width: "12px",
	thumb: "#bdbdbd",
	hover: "#9e9e9e",
	track: "transparent",
} as const;

const standardScrollbarCss = (selector: string): string =>
	[
		"@supports selector(::-webkit-scrollbar){",
		`${selector}::-webkit-scrollbar{width:${STANDARD_BAR.width};height:${STANDARD_BAR.width}}`,
		`${selector}::-webkit-scrollbar-track{background:${STANDARD_BAR.track}}`,
		`${selector}::-webkit-scrollbar-thumb{background:${STANDARD_BAR.thumb};border-radius:0}`,
		`${selector}::-webkit-scrollbar-thumb:hover{background:${STANDARD_BAR.hover}}`,
		"}",
	].join("\n");

/**
 * CSS for a page's scrollbar, aimed at `selector` (`html` on a published page, the canvas scroller
 * in the editor). Custom paints the pixel-and-corner styling for Chrome, Edge and Safari, and the
 * colour plus thin/normal width for other browsers. Those two never apply together, because Chrome
 * would ignore the pixel styling the moment it saw a standard property.
 */
export function buildScrollbarCss({
	selector,
	settings,
}: {
	selector: string;
	settings: ScrollbarSettings | undefined;
}): string {
	if (!settings || !settings.look || settings.look === "default") {
		return standardScrollbarCss(selector);
	}

	if (settings.look === "hidden") {
		return [
			`@supports selector(::-webkit-scrollbar){${selector}::-webkit-scrollbar{display:none}}`,
			`@supports not selector(::-webkit-scrollbar){${selector}{scrollbar-width:none}}`,
		].join("\n");
	}

	const width = safePxLength(settings.width) ?? SCROLLBAR_DEFAULTS.width;
	const thumb = entryColor(settings.thumbColor, SCROLLBAR_DEFAULTS.thumb);
	const track = entryColor(settings.trackColor, SCROLLBAR_DEFAULTS.track);
	const hover = settings.hoverColor ? entryColor(settings.hoverColor, thumb) : settings.thumbColor ? thumb : SCROLLBAR_DEFAULTS.hover;
	const radius = settings.rounded === false ? "0" : "999px";
	const standardWidth = Number.parseFloat(width) <= THIN_LIMIT_PX ? "thin" : "auto";

	return [
		"@supports selector(::-webkit-scrollbar){",
		`${selector}::-webkit-scrollbar{width:${width};height:${width}}`,
		`${selector}::-webkit-scrollbar-track{background:${track}}`,
		`${selector}::-webkit-scrollbar-thumb{background:${thumb};border-radius:${radius}}`,
		`${selector}::-webkit-scrollbar-thumb:hover{background:${hover}}`,
		"}",
		`@supports not selector(::-webkit-scrollbar){${selector}{scrollbar-color:${thumb} ${track};scrollbar-width:${standardWidth}}}`,
	].join("\n");
}
