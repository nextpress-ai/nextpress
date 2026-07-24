import { z } from "zod";
import { formatJson, formatSdkResult, runTool } from "../format-result.js";
import type { ToolDeps } from "./tool-deps.js";

/** Posts list/get/create/update. */
export function registerPostTools({ server, client }: ToolDeps): void {
	server.registerTool(
		"list_posts",
		{
			title: "List posts",
			description: "Paginate blog posts.",
			inputSchema: {
				page: z.number().int().min(1).optional(),
				per_page: z.number().int().min(1).max(100).optional(),
				status: z.enum(["draft", "publish", "preview", "private", "any"]).optional(),
				blogId: z.string().uuid().optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const result = await client.posts.list(args);
				const posts = (result.posts ?? []).map((post) => ({
					id: post.id,
					title: post.title,
					slug: post.slug,
					status: post.status,
					blogId: post.blogId,
					version: post.version ?? 0,
				}));
				return formatJson({ ...result, posts });
			}),
	);

	server.registerTool(
		"get_post",
		{
			title: "Get post",
			description: "Load a post by UUID including blocks. Note version for updates.",
			inputSchema: {
				id: z.string().min(1),
			},
		},
		async ({ id }) => runTool(async () => formatJson(await client.posts.get({ id }))),
	);

	server.registerTool(
		"create_post",
		{
			title: "Create post",
			description: "Create a blog post (defaults to draft). blogId is required.",
			inputSchema: {
				title: z.string().min(1),
				blogId: z.string().uuid(),
				slug: z.string().optional(),
				status: z.string().optional(),
				excerpt: z.string().optional(),
				content: z.string().optional(),
				blocks: z.array(z.record(z.unknown())).optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const result = await client.posts.create({
					title: args.title,
					blogId: args.blogId,
					slug: args.slug,
					status: args.status ?? "draft",
					excerpt: args.excerpt,
					content: args.content,
					blocks: args.blocks as Parameters<typeof client.posts.create>[0]["blocks"],
				});
				return formatSdkResult(result);
			}),
	);

	server.registerTool(
		"update_post",
		{
			title: "Update post",
			description: "Update a post. Requires expectedVersion from get_post.",
			inputSchema: {
				id: z.string().min(1),
				expectedVersion: z.number().int().min(0),
				title: z.string().optional(),
				slug: z.string().optional(),
				status: z.string().optional(),
				excerpt: z.string().optional(),
				content: z.string().optional(),
				blocks: z.array(z.record(z.unknown())).optional(),
			},
		},
		async (args) =>
			runTool(async () => {
				const { id, expectedVersion, ...rest } = args;
				const result = await client.posts.update({
					id,
					expectedVersion,
					...rest,
					blocks: rest.blocks as Parameters<typeof client.posts.update>[0]["blocks"],
				});
				return formatSdkResult(result);
			}),
	);
}
