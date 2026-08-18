import {
	DEFAULT_THEME_DESCRIPTION,
	DEFAULT_THEME_NAME,
	isLegacyDefaultThemeCopy,
	isSystemDefaultTheme,
	SYSTEM_DEFAULT_THEME_OTHER,
} from "@shared/theme-display.js";
import { DEFAULT_THEME_SETTINGS } from "@shared/theme-settings.js";
import { models } from "./storage.js";

/** Renames the old "Custom SSR" seed row so admin copy stays non-technical. */
async function normalizeLegacyDefaultTheme(): Promise<void> {
	const themes = await models.themes.findMany();

	for (const theme of themes) {
		if (!isLegacyDefaultThemeCopy(theme)) {
			continue;
		}

		await models.themes.update(theme.id, {
			name: DEFAULT_THEME_NAME,
			description: DEFAULT_THEME_DESCRIPTION,
			renderer: null,
			other: { ...SYSTEM_DEFAULT_THEME_OTHER },
		});
	}
}

/** Ensures renamed Default rows carry the system flag so they stay read-only in admin. */
async function tagExistingDefaultThemes(): Promise<void> {
	const themes = await models.themes.findMany();

	for (const theme of themes) {
		if (!isSystemDefaultTheme(theme)) {
			continue;
		}

		const other =
			theme.other && typeof theme.other === "object" && !Array.isArray(theme.other)
				? (theme.other as Record<string, unknown>)
				: {};

		if (other.isSystemDefault === true) {
			continue;
		}

		await models.themes.update(theme.id, {
			other: { ...other, ...SYSTEM_DEFAULT_THEME_OTHER },
		});
	}
}

/** Links the default site to the active theme when both exist (FK-safe). */
async function linkDefaultSiteTheme(themeId: string): Promise<void> {
	const site = await models.sites.findDefaultSite();
	if (!site || site.activeThemeId) {
		return;
	}

	const verified = await models.themes.findById(themeId);
	if (!verified) {
		console.warn("[themes] Skipping activeThemeId link — theme not found:", themeId);
		return;
	}

	await models.sites.update(site.id, { activeThemeId: verified.id });
}

/**
 * Seeds a default color theme when the table is empty.
 * Pages render through the block pipeline, not this record.
 */
export async function initializeDefaultThemes(): Promise<void> {
	const themes = await models.themes.findMany();

	if (themes.length > 0) {
		await normalizeLegacyDefaultTheme();
		await tagExistingDefaultThemes();
		const activeTheme = await models.themes.findActiveTheme();
		if (activeTheme?.id) {
			await linkDefaultSiteTheme(activeTheme.id);
		}
		return;
	}

	let authorId: string;
	const users = await models.users.findMany();

	if (users.length === 0) {
		const systemUser = await models.users.create({
			username: "system",
			email: "system@nextpress.local",
			firstName: "System",
			lastName: "User",
			status: "active",
		});
		authorId = systemUser.id;
	} else {
		authorId = users[0].id;
	}

	const defaultTheme = await models.themes.create({
		name: DEFAULT_THEME_NAME,
		description: DEFAULT_THEME_DESCRIPTION,
		authorId,
		version: "1.0.0",
		requires: "1.0.0",
		status: "active",
		settings: {
			...DEFAULT_THEME_SETTINGS,
			colors: {
				...DEFAULT_THEME_SETTINGS.colors,
				primary: "#0073aa",
				secondary: "#005177",
				accent: "#00a0d2",
				background: "#ffffff",
				foreground: "#23282d",
			},
		},
		other: { ...SYSTEM_DEFAULT_THEME_OTHER },
	});

	console.log("Default theme initialized:", defaultTheme.name);
	await linkDefaultSiteTheme(defaultTheme.id);
}
