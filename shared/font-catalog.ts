import type { BlockConfig } from "@shared/schema-types";

/** How a picker entry is loaded at runtime. */
export type FontSourceKind = "system" | "bundled";

export type FontCatalogEntry = {
	/** Stored on `page.other.design.fontFamily` or `block.styles.fontFamily`. */
	value: string;
	label: string;
	source: FontSourceKind;
	/** @fontsource package id (e.g. `inter` → `@fontsource/inter`). */
	fontsourceId?: string;
};

/** Block-level picker includes inherit; page settings omit empty inherit row separately. */
export const BLOCK_FONT_CATALOG: readonly FontCatalogEntry[] = [
	{ value: "", label: "Default (Inherit)", source: "system" },
	{ value: "system-ui", label: "System Default", source: "system" },
	{ value: "Inter, sans-serif", label: "Inter", source: "bundled", fontsourceId: "inter" },
	{ value: "Georgia, serif", label: "Georgia", source: "system" },
	{ value: "Roboto, sans-serif", label: "Roboto", source: "bundled", fontsourceId: "roboto" },
	{
		value: "Merriweather, serif",
		label: "Merriweather",
		source: "bundled",
		fontsourceId: "merriweather",
	},
	{ value: "Lato, sans-serif", label: "Lato", source: "bundled", fontsourceId: "lato" },
	{
		value: '"Open Sans", sans-serif',
		label: "Open Sans",
		source: "bundled",
		fontsourceId: "open-sans",
	},
	{
		value: '"Playfair Display", serif',
		label: "Playfair Display",
		source: "bundled",
		fontsourceId: "playfair-display",
	},
	{
		value: '"Source Sans Pro", sans-serif',
		label: "Source Sans Pro",
		source: "bundled",
		fontsourceId: "source-sans-pro",
	},
	{
		value: "Montserrat, sans-serif",
		label: "Montserrat",
		source: "bundled",
		fontsourceId: "montserrat",
	},
] as const;

/** Page design font picker (no inherit row). */
export const PAGE_FONT_CATALOG: readonly FontCatalogEntry[] = BLOCK_FONT_CATALOG.filter(
	(entry) => entry.value !== "",
);

const BY_VALUE = new Map(BLOCK_FONT_CATALOG.map((entry) => [entry.value, entry]));

/** Parses the primary face name from a CSS `font-family` value. */
export const parsePrimaryFontName = (fontFamily: string): string =>
	fontFamily.split(",")[0]?.trim().replace(/["']/g, "") ?? "";

/** Looks up a catalog entry by stored CSS value. */
export const findFontCatalogEntry = (
	fontFamily: string | undefined,
): FontCatalogEntry | undefined => {
	if (!fontFamily) return undefined;
	return BY_VALUE.get(fontFamily);
};

/**
 * Resolves stored CSS `font-family` to a catalog `value` so pickers show the right selection.
 * Handles legacy values like `system-ui, sans-serif` that differ from catalog strings.
 */
export const resolveFontCatalogValue = (fontFamily: string | undefined): string => {
	if (!fontFamily?.trim()) {
		return PAGE_FONT_CATALOG[0]?.value ?? "system-ui";
	}

	const exact = findFontCatalogEntry(fontFamily);
	if (exact) return exact.value;

	const primary = parsePrimaryFontName(fontFamily).toLowerCase();
	for (const entry of PAGE_FONT_CATALOG) {
		if (parsePrimaryFontName(entry.value).toLowerCase() === primary) {
			return entry.value;
		}
	}

	return fontFamily;
};

/** Human label for a stored font-family value (falls back to parsed face name). */
export const resolveFontCatalogLabel = (fontFamily: string | undefined): string => {
	if (!fontFamily?.trim()) return "System Default";
	const resolved = resolveFontCatalogValue(fontFamily);
	return findFontCatalogEntry(resolved)?.label ?? parsePrimaryFontName(fontFamily);
};

/** True when the family is bundled via Fontsource (not system-only). */
export const isBundledFontFamily = (fontFamily: string | undefined): boolean =>
	findFontCatalogEntry(fontFamily)?.source === "bundled";

/** Stable stylesheet path for SSR HTML shell (built to client/public). */
export const BUNDLED_FONTS_STYLESHEET = "/assets/css/bundled-fonts.css";

/** Collects non-empty `fontFamily` values from blocks and nested children. */
export const collectFontFamiliesFromBlocks = (blocks: BlockConfig[]): string[] => {
	const families = new Set<string>();

	const walk = (list: BlockConfig[]): void => {
		for (const block of list) {
			const fontFamily = block.styles?.fontFamily;
			if (typeof fontFamily === "string" && fontFamily.trim() !== "") {
				families.add(fontFamily.trim());
			}
			if (block.children?.length) {
				walk(block.children);
			}
		}
	};

	walk(blocks);
	return [...families];
};
