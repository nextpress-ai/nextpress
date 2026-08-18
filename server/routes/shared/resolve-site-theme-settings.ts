import type { ThemeSettings } from "@shared/theme-settings";
import { parseThemeSettings } from "@shared/theme-settings";
import type { Deps } from "./deps";

type ThemeModel = Deps["models"]["themes"];
type SiteModel = Deps["models"]["sites"];

export type ResolvedSiteTheme = {
	themeId: string | null;
	settings: ThemeSettings;
	rawSettings: unknown;
};

/**
 * Loads parsed design settings for a site's active theme.
 * Falls back to defaults when no theme is linked.
 */
export async function resolveSiteThemeSettings({
	models,
	siteId,
}: {
	models: { themes: ThemeModel; sites: SiteModel };
	siteId: string;
}): Promise<ResolvedSiteTheme> {
	const site = await models.sites.findById(siteId);
	if (!site?.activeThemeId) {
		return {
			themeId: null,
			settings: parseThemeSettings(null),
			rawSettings: null,
		};
	}

	const theme = await models.themes.findById(site.activeThemeId);
	if (!theme) {
		return {
			themeId: null,
			settings: parseThemeSettings(null),
			rawSettings: null,
		};
	}

	return {
		themeId: theme.id,
		settings: parseThemeSettings(theme.settings),
		rawSettings: theme.settings,
	};
}
