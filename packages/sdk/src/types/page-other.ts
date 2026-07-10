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

/** Semantic HTML tags allowed on group blocks. */
export const GROUP_HTML_TAG_NAMES = [
	"div",
	"section",
	"article",
	"main",
	"header",
	"footer",
	"aside",
	"nav",
] as const;
export type GroupHtmlTagName = (typeof GROUP_HTML_TAG_NAMES)[number];

/** Semantic HTML tags allowed on container blocks. */
export const CONTAINER_HTML_TAG_NAMES = ["div", "section", "article", "aside"] as const;
export type ContainerHtmlTagName = (typeof CONTAINER_HTML_TAG_NAMES)[number];

/** Common HTML meta `name` values editors may set. */
export const STANDARD_META_TAG_NAMES = [
	"description",
	"keywords",
	"author",
	"viewport",
	"robots",
	"theme-color",
	"format-detection",
	"referrer",
	"application-name",
	"generator",
] as const;
export type StandardMetaTagName = (typeof STANDARD_META_TAG_NAMES)[number];

export type MetaTagName =
	| StandardMetaTagName
	| `og:${string}`
	| `twitter:${string}`
	| `article:${string}`;

export type MetaTagEntry = {
	name: MetaTagName | string;
	content: string;
};

export type PageSeoSettings = {
	metaTitle?: string;
	metaDescription?: string;
	canonicalUrl?: string;
	noIndex?: boolean;
	customMeta?: MetaTagEntry[];
};

export type PageDesignSettings = {
	fontFamily?: string;
	containerWidth?: string;
	padding?: string;
	backgroundColor?: Record<string, unknown>;
	textColor?: Record<string, unknown>;
};

export type PageIconSettings = {
	defaultSet: PageIconDefaultSet;
	allowedSets?: ReactIconsPrefix[];
	defaultSize?: number;
};

export type PageOther = {
	seo?: PageSeoSettings;
	design?: PageDesignSettings;
	icons?: PageIconSettings;
	isBlogPage?: boolean;
	blogId?: string;
	categories?: string[];
	tags?: string[];
};

/** Baseline page.other for SDK page creation. */
export const DEFAULT_PAGE_OTHER: PageOther = {
	design: {
		fontFamily: "system-ui",
		containerWidth: "1200px",
		padding: "2rem 1rem",
	},
	icons: {
		defaultSet: "lucide",
		defaultSize: 24,
	},
	seo: {},
};

/** Merges SDK input with baseline page.other defaults. */
export function buildDefaultPageOther(overrides?: Partial<PageOther>): PageOther {
	return {
		...DEFAULT_PAGE_OTHER,
		...overrides,
		design: { ...DEFAULT_PAGE_OTHER.design, ...overrides?.design },
		icons: {
			defaultSet: overrides?.icons?.defaultSet ?? DEFAULT_PAGE_OTHER.icons!.defaultSet,
			defaultSize: overrides?.icons?.defaultSize ?? DEFAULT_PAGE_OTHER.icons!.defaultSize,
			allowedSets: overrides?.icons?.allowedSets,
		},
		seo: { ...DEFAULT_PAGE_OTHER.seo, ...overrides?.seo },
	};
}
