import { z } from "zod";
import { formatJson, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Templates list/get. */
export function registerTemplateTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_templates",
		{
			title: "List templates",
			description: "List page/post templates available on the site.",
			inputSchema: {
				page: z.number().int().min(1).optional(),
				per_page: z.number().int().min(1).max(100).optional(),
			},
		},
		async (args) =>
			runTool(async () => formatJson(await client.templates.list(args))),
	);

	server.registerTool(
		"get_template",
		{
			title: "Get template",
			description: "Load one template including its block tree.",
			inputSchema: {
				id: z.string().min(1),
			},
		},
		async ({ id }) => runTool(async () => formatJson(await client.templates.get({ id }))),
	);
}
