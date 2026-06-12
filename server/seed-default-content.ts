import "dotenv/config";
import { pathToFileURL } from "node:url";
import { models } from "./storage.js";
import { initializeDefaultTemplates } from "./initialize-default-templates.js";
import { initializeDefaultThemes } from "./themes.js";

/**
 * Picks a user to own seeded templates — admin site owner on upgrades, first user fallback.
 */
async function resolveSeedAuthorId(): Promise<string> {
	const users = await models.users.findMany();
	if (users.length > 0) {
		return users[0].id;
	}

	const systemUser = await models.users.create({
		username: "system",
		email: "system@nextpress.local",
		firstName: "System",
		lastName: "User",
		status: "active",
	});
	return systemUser.id;
}

/**
 * Idempotent default content for fresh installs (setup) and CLI upgrade.
 * Skips templates/themes that already exist.
 */
export async function seedDefaultContent(): Promise<void> {
	await initializeDefaultThemes();

	const authorId = await resolveSeedAuthorId();
	await initializeDefaultTemplates({ authorId });

	const site = await models.sites.findDefaultSite();
	const activeTheme = await models.themes.findActiveTheme();
	if (site && activeTheme && !site.activeThemeId) {
		await models.sites.update(site.id, { activeThemeId: activeTheme.id });
	}
}

async function main(): Promise<void> {
	await seedDefaultContent();
	console.log("[seed] Default content check complete.");
}

const entryHref = process.argv[1]
	? pathToFileURL(process.argv[1]).href
	: "";
const isDirectRun = entryHref !== "" && import.meta.url === entryHref;

if (isDirectRun) {
	main()
		.then(() => process.exit(0))
		.catch((error: unknown) => {
			console.error("[seed] Failed:", error);
			process.exit(1);
		});
}
