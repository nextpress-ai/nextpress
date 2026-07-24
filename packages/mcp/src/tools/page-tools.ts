import { z } from "zod";
import { formatJson, formatSdkResult, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Pages list/get/create/update/publish. */
export function registerPageTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_pages",
		{
			title: "List pages",
			description: "Paginate pages (id, title, slug, status, version).",
			inputSchema: {
				page: z.number().int().min(1).optional(),
				per_page: z.number().int().min(1).max(100).optional(),
				status: z.enum(["draft", "publish", "preview", "private", "any"]).optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const result = await client.pages.list(args);
				const pages = (result.pages ?? []).map((page) => ({
					id: page.id,
					title: page.title,
					slug: page.slug,
					status: page.status,
					version: page.version ?? 0,
				}));
				return formatJson({ ...result, pages });
			}),
	);

	server.registerTool(
		"get_page",
		{
			title: "Get page",
			description:
				"Load a page by UUID or slug including blocks. Note version for updates (expectedVersion).",
			inputSchema: {
				id: z.string().min(1).describe("Page UUID or slug"),
			},
		},
		async ({ id }) => runTool(async () => formatJson(await client.pages.get({ id }))),
	);

	server.registerTool(
		"create_page",
		{
			title: "Create page",
			description:
				"Create a page. Defaults to draft so owners can review in the admin CMS. Pass blocks from build_blocks.",
			inputSchema: {
				title: z.string().min(1),
				slug: z.string().optional(),
				status: z.string().optional().describe("Defaults to draft"),
				blocks: z.array(z.record(z.unknown())).optional(),
				content: z.string().optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const result = await client.pages.create({
					title: args.title,
					slug: args.slug,
					status: args.status ?? "draft",
					content: args.content,
					blocks: args.blocks as Parameters<typeof client.pages.create>[0]["blocks"],
				});
				return formatSdkResult(result);
			}),
	);

	server.registerTool(
		"update_page",
		{
			title: "Update page",
			description:
				"Update page metadata/blocks. Requires expectedVersion from get_page. On VERSION_STALE, re-get and retry.",
			inputSchema: {
				id: z.string().min(1),
				expectedVersion: z.number().int().min(0),
				title: z.string().optional(),
				slug: z.string().optional(),
				status: z.string().optional(),
				blocks: z.array(z.record(z.unknown())).optional(),
				content: z.string().optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const { id, expectedVersion, ...rest } = args;
				const result = await client.pages.update({
					id,
					expectedVersion,
					...rest,
					blocks: rest.blocks as Parameters<typeof client.pages.update>[0]["blocks"],
				});
				return formatSdkResult(result);
			}),
	);

	server.registerTool(
		"publish_page",
		{
			title: "Publish page",
			description:
				"Set page status to published. Requires expectedVersion from get_page. Prefer draft until the owner asks to publish.",
			inputSchema: {
				id: z.string().min(1),
				expectedVersion: z.number().int().min(0),
			},
		},
		async ({ id, expectedVersion }) =>
			runTool(async () => {
				const result = await client.pages.update({
					id,
					expectedVersion,
					status: "publish",
				});
				return formatSdkResult(result);
			}),
	);
}
