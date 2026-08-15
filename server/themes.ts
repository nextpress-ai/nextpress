import { models } from "./storage.js";

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
		name: "Default",
		description: "Default colors for new sites.",
		authorId,
		version: "1.0.0",
		requires: "1.0.0",
		status: "active",
		settings: {
			colors: {
				primary: "#0073aa",
				secondary: "#005177",
				background: "#ffffff",
				text: "#23282d",
				accent: "#00a0d2",
			},
			layout: {
				maxWidth: "800px",
				sidebar: "none",
				navigation: "top",
			},
			features: {
				responsiveDesign: true,
				darkMode: false,
			},
		},
	});

	console.log("Default theme initialized:", defaultTheme.name);
	await linkDefaultSiteTheme(defaultTheme.id);
}
