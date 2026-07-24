import { formatJson, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Site branding / theme / settings / health. */
export function registerSiteTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"get_site_context",
		{
			title: "Get site context",
			description:
				"Site branding, active theme, settings, and health — start here before editing content.",
			inputSchema: {},
		},
		async () =>
			runTool(async () => {
				const [site, theme, settings, health] = await Promise.all([
					client.site.get().catch((error: Error) => ({ error: error.message })),
					client.themes.getActive().catch((error: Error) => ({ error: error.message })),
					client.settings.get().catch((error: Error) => ({ error: error.message })),
					client.health.check().catch((error: Error) => ({ error: error.message })),
				]);
				return formatJson({ site, theme, settings, health });
			}),
	);
}
