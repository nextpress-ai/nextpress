import type { PageDesignSettings, PageIconSettings, PageOther, TokenEntry } from "./schema-types.js";
import { DEFAULT_PAGE_DESIGN, DEFAULT_PAGE_ICONS, mergePageOtherWithDefaults } from "./page-other.js";
import type { ThemeSettings } from "./theme-settings.js";
import { DEFAULT_THEME_SETTINGS } from "./theme-settings.js";

const colorTokenEntry = ({
	property,
	alias,
	color,
}: {
	property: string;
	alias: string;
	color: string;
}): TokenEntry => ({
	property,
	value: "",
	variant: null,
	alias,
	style: color,
});

export type ThemeSeededPageDefaults = {
	design: Partial<PageDesignSettings>;
	icons: Partial<PageIconSettings>;
};

/**
 * Seeds new page.other fields from the active site theme — starting point only;
 * Page Settings and block styles can override afterward.
 */
export const themeSettingsToInitialPageDesign = (
	settings: ThemeSettings,
): ThemeSeededPageDefaults => {
	const colors = settings.colors ?? DEFAULT_THEME_SETTINGS.colors!;
	const typography = settings.typography ?? DEFAULT_THEME_SETTINGS.typography;
	const icons = settings.icons ?? DEFAULT_THEME_SETTINGS.icons;

	const design: Partial<PageDesignSettings> = {
		fontFamily: typography?.body?.fontFamily ?? DEFAULT_THEME_SETTINGS.typography!.body!.fontFamily,
		containerWidth: "1200px",
		padding: "2rem 1rem",
	};

	if (colors.background) {
		design.backgroundColor = colorTokenEntry({
			property: "backgroundColor",
			alias: "bg",
			color: colors.background,
		});
	}

	if (colors.foreground) {
		design.textColor = colorTokenEntry({
			property: "color",
			alias: "text",
			color: colors.foreground,
		});
	}

	const iconDefaults: Partial<PageIconSettings> = {};
	if (icons?.set) {
		iconDefaults.defaultSet = icons.set;
	}

	return { design, icons: iconDefaults };
};

/** Merges theme seed into page.other on create — does not overwrite explicit caller values. */
export const mergePageOtherWithThemeDefaults = ({
	themeSettings,
	other,
}: {
	themeSettings?: ThemeSettings | null;
	other?: unknown;
}): PageOther => {
	const base = mergePageOtherWithDefaults(other);
	if (!themeSettings) {
		return base;
	}

	const seeded = themeSettingsToInitialPageDesign(themeSettings);
	return {
		...base,
		design: { ...DEFAULT_PAGE_DESIGN, ...seeded.design, ...base.design },
		icons: {
			defaultSet: seeded.icons.defaultSet ?? base.icons?.defaultSet ?? DEFAULT_PAGE_ICONS.defaultSet,
			defaultSize: base.icons?.defaultSize ?? DEFAULT_PAGE_ICONS.defaultSize,
			allowedSets: base.icons?.allowedSets,
		},
	};
};

/**
 * Resolves visitor layout and colors for pages and posts. Posts never store
 * other.design, so public and preview surfaces seed from the active theme or
 * DEFAULT_PAGE_DESIGN instead of rendering full-bleed without padding.
 */
export const resolveVisitorDesign = ({
	design,
	themeSettings,
}: {
	design?: PageDesignSettings | null;
	themeSettings?: ThemeSettings | null;
}): PageDesignSettings => {
	const seeded = themeSettings
		? themeSettingsToInitialPageDesign(themeSettings).design
		: {};
	return {
		...DEFAULT_PAGE_DESIGN,
		...seeded,
		...(design ?? {}),
	};
};
