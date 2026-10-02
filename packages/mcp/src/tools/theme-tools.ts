import { z } from "zod";
import { formatJson, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

const themeSettingsSchema = z
	.object({
		colors: z.record(z.string()).optional(),
		typography: z
			.record(
				z.object({
					fontFamily: z.string().optional(),
					fontSize: z.string().optional(),
					fontWeight: z.string().optional(),
					lineHeight: z.string().optional(),
				}),
			)
			.optional(),
		buttons: z.object({ fontFamily: z.string().optional() }).optional(),
		shape: z.object({ radius: z.string().optional() }).optional(),
	})
	.passthrough();

type ThemeRow = {
	id: string;
	name: string;
	description?: string | null;
	status?: string;
	settings?: {
		colors?: Record<string, string>;
		typography?: Record<string, { fontFamily?: string; fontSize?: string; fontWeight?: string; lineHeight?: string }>;
		buttons?: { fontFamily?: string };
		shape?: { radius?: string };
	};
};

/**
 * Theme tools. List and activate go through the SDK. Reading and saving a theme's
 * design uses the same HTTP client, because those calls are not on the published SDK yet.
 */
export function registerThemeTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_themes",
		{
			title: "List themes",
			description: "List installed themes (id, name, whether it is the active one).",
			inputSchema: {},
		},
		async () =>
			runTool(async () => {
				const themes = await client.themes.list();
				return formatJson({
					themes: themes.map((theme) => ({
						id: theme.id,
						name: theme.name,
						isActive: theme.isActive === true,
					})),
				});
			}),
	);

	server.registerTool(
		"get_theme",
		{
			title: "Get theme",
			description: "Load one theme, including colors and type. Use the id from list_themes or get_site_context.",
			inputSchema: { id: z.string().uuid() },
		},
		async ({ id }) =>
			runTool(async () => formatJson(await client.http.request<ThemeRow>(`/api/themes/${id}`))),
	);

	server.registerTool(
		"create_theme",
		{
			title: "Create theme",
			description: "Add a theme. It is not the site theme until activate_theme.",
			inputSchema: {
				name: z.string().min(1).max(120),
				description: z.string().max(500).optional(),
				settings: themeSettingsSchema.optional(),
			},
		},
		async (args) =>
			runTool(async () =>
				formatJson(await client.http.request<ThemeRow>("/api/themes", { method: "POST", body: args })),
			),
	);

	server.registerTool(
		"update_theme",
		{
			title: "Update theme",
			description: "Change a theme's name or design. The built-in Default theme cannot be edited.",
			inputSchema: {
				id: z.string().uuid(),
				name: z.string().min(1).max(120).optional(),
				description: z.string().max(500).nullable().optional(),
				settings: themeSettingsSchema.optional(),
			},
		},
		async ({ id, ...body }) =>
			runTool(async () =>
				formatJson(await client.http.request<ThemeRow>(`/api/themes/${id}`, { method: "PATCH", body })),
			),
	);

	server.registerTool(
		"activate_theme",
		{
			title: "Activate theme",
			description: "Make this theme the one the current site draws with.",
			inputSchema: { id: z.string().uuid() },
		},
		async ({ id }) => runTool(async () => formatJson(await client.themes.activate({ id }))),
	);
}
