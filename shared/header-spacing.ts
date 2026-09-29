import type { DimensionPreset } from "./dimension-presets.js";
import { safeCssLength } from "./css-safe.js";

/** Space above and below the header's row. Normal matches the header before this setting. */
export const HEADER_TOP_BOTTOM_PADDING_PRESETS: readonly DimensionPreset[] = [
	{ value: "0", label: "None" },
	{ value: "0.5rem", label: "Tight" },
	{ value: "0.75rem", label: "Normal" },
	{ value: "1.25rem", label: "Roomy" },
	{ value: "2rem", label: "Wide" },
] as const;

/** Space at the header's left and right edges. Normal matches the header before this setting. */
export const HEADER_SIDE_PADDING_PRESETS: readonly DimensionPreset[] = [
	{ value: "0", label: "None" },
	{ value: "0.75rem", label: "Tight" },
	{ value: "1.25rem", label: "Normal" },
	{ value: "2rem", label: "Roomy" },
	{ value: "3rem", label: "Wide" },
] as const;

/** How wide the logo, links and buttons row may get. The background always spans the page. */
export const HEADER_CONTENT_WIDTH_PRESETS: readonly DimensionPreset[] = [
	{ value: "100%", label: "Full" },
	{ value: "960px", label: "960" },
	{ value: "1200px", label: "1200" },
	{ value: "1440px", label: "1440" },
] as const;

export const DEFAULT_HEADER_PADDING_BLOCK = "0.75rem";
export const DEFAULT_HEADER_PADDING_INLINE = "1.25rem";
export const DEFAULT_HEADER_CONTENT_WIDTH = "100%";

export type HeaderSpacing = {
	/** Top and bottom padding of the row. */
	paddingBlock?: string;
	/** Left and right padding of the row. */
	paddingInline?: string;
	/** Largest width of the row; it sits centred while the background stays edge to edge. */
	contentWidth?: string;
};

/** `0` has no unit but is a fine length; everything else must be a plain CSS length. */
const readLength = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim() === "0" ? "0" : safeCssLength(value);

/** Saved spacing, keeping only values that are safe to write into CSS. */
export function readHeaderSpacing(data: Record<string, unknown>): HeaderSpacing {
	const spacing: HeaderSpacing = {
		paddingBlock: readLength(data.paddingBlock),
		paddingInline: readLength(data.paddingInline),
		contentWidth: readLength(data.contentWidth),
	};
	return Object.fromEntries(Object.entries(spacing).filter(([, value]) => value !== undefined)) as HeaderSpacing;
}

/**
 * CSS variables the shared header rules read (`--np-header-pad-block`, `--np-header-pad-inline`,
 * `--np-header-max-width`). Unset values are left out so the defaults in the stylesheet apply.
 */
export function headerSpacingDecls(spacing: HeaderSpacing): string {
	return [
		spacing.paddingBlock ? `--np-header-pad-block:${spacing.paddingBlock}` : "",
		spacing.paddingInline ? `--np-header-pad-inline:${spacing.paddingInline}` : "",
		spacing.contentWidth && spacing.contentWidth !== "100%" ? `--np-header-max-width:${spacing.contentWidth}` : "",
	]
		.filter(Boolean)
		.join(";");
}
