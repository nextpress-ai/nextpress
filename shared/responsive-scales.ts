import { BREAKPOINT_MAP } from "./token-resolution.js";

/** Canonical viewport tiers aligned with Tailwind breakpoints. */
export type ViewportTier = "mobile" | "medium" | "large";

export const RESPONSIVE_TIERS = {
	mobile: { maxWidthPx: 767, label: "Mobile (<768px)" },
	medium: { minWidthPx: 768, maxWidthPx: 1023, label: "Tablet (768–1023px)" },
	large: { minWidthPx: 1024, label: "Desktop (≥1024px)" },
} as const;

export { BREAKPOINT_MAP };

/** Fluid heading sizes — applied via publish CSS unless user set explicit fontSize. */
export const FLUID_HEADING_CSS = `
.wp-block-heading h1, h1.wp-block-heading,
h1.wp-block-post-title { font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 800; }
.wp-block-heading h2, h2.wp-block-heading,
h2.wp-block-post-title { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 700; }
.wp-block-heading h3, h3.wp-block-heading,
h3.wp-block-post-title { font-size: clamp(1.25rem, 3vw, 1.5rem); font-weight: 700; }
`.trim();

/** Tier-based spacing values for runtime defaults. */
export const SPACING_BY_TIER = {
	pagePadding: { mobile: "1rem", medium: "1.5rem", large: "2rem 1rem" },
	containerPadding: { mobile: "16px", medium: "20px", large: "24px" },
	groupPadding: { mobile: "1rem", medium: "1.25rem", large: "1.25em 2.375em" },
	blockStackGap: { mobile: "0.5rem", medium: "0.5rem", large: "0.5rem" },
} as const;

export const PROSE_MAX_WIDTH = "65ch";
export const MIN_TOUCH_TARGET_PX = 44;
export const MIN_FORM_FONT_SIZE = "16px";

/** Maps editor device view to viewport tier for default selection. */
export function deviceViewToTier(device: "desktop" | "tablet" | "mobile"): ViewportTier {
	if (device === "mobile") return "mobile";
	if (device === "tablet") return "medium";
	return "large";
}

/** Maps a pixel width to the nearest viewport tier. */
export function widthPxToTier(widthPx: number): ViewportTier {
	if (widthPx < RESPONSIVE_TIERS.medium.minWidthPx) return "mobile";
	if (widthPx < RESPONSIVE_TIERS.large.minWidthPx) return "medium";
	return "large";
}
