import { z } from "zod";
import { formatJson, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Blog lookup so agents can attach posts without guessing UUIDs. */
export function registerBlogTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_blogs",
		{
			title: "List blogs",
			description: "Paginate blogs for this site. Use the id as blogId when creating posts.",
			inputSchema: {
				page: z.number().int().min(1).optional(),
				per_page: z.number().int().min(1).max(100).optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const result = await client.blogs.list(args);
				const blogs = (result.blogs ?? []).map((blog) => ({
					id: blog.id,
					name: blog.name,
					slug: blog.slug,
					status: blog.status,
					siteId: blog.siteId,
				}));
				return formatJson({ ...result, blogs });
			}),
	);

	server.registerTool(
		"get_blog",
		{
			title: "Get blog",
			description: "Load one blog by UUID.",
			inputSchema: {
				id: z.string().uuid(),
			},
		},
		async ({ id }) => runTool(async () => formatJson(await client.blogs.get({ id }))),
	);

	server.registerTool(
		"create_blog",
		{
			title: "Create blog",
			description: "Create a blog section. Posts require this blogId.",
			inputSchema: {
				name: z.string().min(1),
				slug: z.string().optional(),
			},
		},
		async (args) =>
			runTool(async () => formatJson(await client.blogs.create({ name: args.name, slug: args.slug }))),
	);
}
