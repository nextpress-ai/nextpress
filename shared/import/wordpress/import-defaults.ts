import type { BlockConfig, PageDesignSettings, PageIconSettings } from "../../schema-types";
import type { WordPressPostImportOther } from "./types";

/** Matches `getDefaultBlock` baseline spacing in the page builder. */
export const IMPORT_BLOCK_BASE_PADDING = "20px";
export const IMPORT_BLOCK_BASE_MARGIN = "0px";

export const IMPORT_BLOCK_UNITS = {
	spacing: "px",
	font: "rem",
	dimension: "px",
	border: "px",
} as const;

/** Extra margins aligned with block registry `defaultStyles` for layout/media blocks. */
const IMPORT_LAYOUT_BLOCK_STYLES: Partial<Record<string, Record<string, string>>> = {
	"core/columns": { margin: "1em 0" },
	"core/buttons": { margin: "1em 0" },
	"core/gallery": { margin: "1em 0", width: "100%" },
	"core/quote": { margin: "1em 0" },
	"core/separator": { margin: "1em 0" },
	"core/image": { width: "100%" },
};

/** Page design defaults — same as Page Settings UI initial state. */
export const DEFAULT_IMPORTED_PAGE_DESIGN: PageDesignSettings = {
	fontFamily: "system-ui",
	containerWidth: "1200px",
	padding: "2rem 1rem",
};

/** Icon defaults — same as Page Settings / PageContext. */
export const DEFAULT_IMPORTED_PAGE_ICONS: PageIconSettings = {
	defaultSet: "lucide",
	defaultSize: 24,
};

/**
 * Applies NextPress-native block scaffolding so imported content matches
 * manually created blocks in the editor (padding, token units, layout margins).
 * WP-derived styles from `attachImportElementMeta` still win on conflict.
 */
export const applyImportBlockDefaults = (block: BlockConfig): BlockConfig => {
	const layoutStyles = IMPORT_LAYOUT_BLOCK_STYLES[block.name] ?? {};

	const withDefaults: BlockConfig = {
		...block,
		styles: {
			padding: IMPORT_BLOCK_BASE_PADDING,
			margin: IMPORT_BLOCK_BASE_MARGIN,
			...layoutStyles,
			...block.styles,
		},
		settings: block.settings ?? {},
		other: {
			tokenMap: {},
			units: { ...IMPORT_BLOCK_UNITS },
			...(block.other ?? {}),
		},
	};

	if (block.children?.length) {
		withDefaults.children = block.children.map(applyImportBlockDefaults);
	}

	return withDefaults;
};

/** Applies block defaults to every root block in imported content. */
export const applyImportBlocksDefaults = (
	blocks: BlockConfig[] | undefined | null,
): BlockConfig[] => (blocks ?? []).map(applyImportBlockDefaults);

/**
 * Merges WordPress import metadata with sensible page-level settings so
 * imported pages render with the same shell defaults as the Page Settings UI.
 */
export const buildImportedPageOther = (params: {
	baseOther: WordPressPostImportOther;
	title: string;
	excerpt: string | null;
}): WordPressPostImportOther & {
	design: PageDesignSettings;
	icons: PageIconSettings;
	seo: { metaTitle?: string; metaDescription?: string };
} => ({
	...params.baseOther,
	design: DEFAULT_IMPORTED_PAGE_DESIGN,
	icons: DEFAULT_IMPORTED_PAGE_ICONS,
	seo: {
		metaTitle: params.title || undefined,
		metaDescription: params.excerpt || undefined,
	},
});
