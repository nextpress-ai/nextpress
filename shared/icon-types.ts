/** Block-level icon set identifiers (icon + button blocks). */
export const ICON_SET_IDS = ["lucide", "react-icons", "svgl"] as const;
export type IconSetId = (typeof ICON_SET_IDS)[number];

/** Page-level default icon set (includes picker mode). */
export const PAGE_ICON_DEFAULT_SETS = ["lucide", "react-icons", "svgl", "all"] as const;
export type PageIconDefaultSet = (typeof PAGE_ICON_DEFAULT_SETS)[number];

/** react-icons library prefixes exposed in the icon picker. */
export const REACT_ICONS_PREFIXES = [
	"lu",
	"tb",
	"fa6",
	"hi2",
	"ri",
	"pi",
	"bs",
	"io5",
	"rx",
] as const;
export type ReactIconsPrefix = (typeof REACT_ICONS_PREFIXES)[number];

export function isIconSetId(value: unknown): value is IconSetId {
	return (
		typeof value === "string" &&
		(ICON_SET_IDS as readonly string[]).includes(value)
	);
}

export function isPageIconDefaultSet(value: unknown): value is PageIconDefaultSet {
	return (
		typeof value === "string" &&
		(PAGE_ICON_DEFAULT_SETS as readonly string[]).includes(value)
	);
}

export function isReactIconsPrefix(value: unknown): value is ReactIconsPrefix {
	return (
		typeof value === "string" &&
		(REACT_ICONS_PREFIXES as readonly string[]).includes(value)
	);
}
