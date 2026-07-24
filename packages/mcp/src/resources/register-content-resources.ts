import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BLOCK_DEFINITIONS, type NextpressClient } from "@nextpress-org/sdk";
import { registerBlockSchemaResource } from "../tools/patch-tools.js";

/**
 * Register read-only MCP resources for site discovery.
 */
export function registerContentResources({
	server,
	client,
}: {
	server: McpServer;
	client: NextpressClient;
}): void {
	registerBlockSchemaResource({ server });

	server.registerResource(
		"blocks-catalog",
		"nextpress://blocks/catalog",
		{
			title: "Block catalog",
			description: "Canonical NextPress block names and metadata",
			mimeType: "application/json",
		},
		async (uri) => {
			const blocks = client.blocks.names.map((name) => {
				const def = BLOCK_DEFINITIONS[name];
				return {
					name: def.name,
					label: def.label,
					type: def.type,
					category: def.category,
				};
			});
			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify({ blocks }, null, 2),
					},
				],
			};
		},
	);

	server.registerResource(
		"site-map",
		"nextpress://site/map",
		{
			title: "Site map",
			description: "Pages and posts: slug → title → status",
			mimeType: "application/json",
		},
		async (uri) => {
			const [pagesRes, postsRes] = await Promise.all([
				client.pages.list({ per_page: 100, status: "any" }),
				client.posts.list({ per_page: 100, status: "any" }),
			]);
			const pages = (pagesRes.pages ?? []).map((page) => ({
				id: page.id,
				slug: page.slug,
				title: page.title,
				status: page.status,
				version: page.version ?? 0,
			}));
			const posts = (postsRes.posts ?? []).map((post) => ({
				id: post.id,
				slug: post.slug,
				title: post.title,
				status: post.status,
				blogId: post.blogId,
				version: post.version ?? 0,
			}));
			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify({ pages, posts }, null, 2),
					},
				],
			};
		},
	);

	server.registerResource(
		"site-context",
		"nextpress://site/context",
		{
			title: "Site context",
			description: "Branding, theme, settings, and health",
			mimeType: "application/json",
		},
		async (uri) => {
			const [site, theme, settings, health] = await Promise.all([
				client.site.get().catch((error: Error) => ({ error: error.message })),
				client.themes.getActive().catch((error: Error) => ({ error: error.message })),
				client.settings.get().catch((error: Error) => ({ error: error.message })),
				client.health.check().catch((error: Error) => ({ error: error.message })),
			]);
			return {
				contents: [
					{
						uri: uri.href,
						mimeType: "application/json",
						text: JSON.stringify({ site, theme, settings, health }, null, 2),
					},
				],
			};
		},
	);
}
