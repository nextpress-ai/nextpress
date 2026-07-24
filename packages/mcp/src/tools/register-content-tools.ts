import { registerBlockTools } from "./block-tools.js";
import { registerMediaTools } from "./media-tools.js";
import { registerPageTools } from "./page-tools.js";
import { registerPatchTools } from "./patch-tools.js";
import { registerPostTools } from "./post-tools.js";
import { registerPreviewTools } from "./preview-tools.js";
import { registerSiteTools } from "./site-tools.js";
import { registerTemplateTools } from "./template-tools.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NextpressClient } from "@nextpress-org/sdk";

/**
 * Register content-core MCP tools backed by the NextPress SDK.
 */
export function registerContentTools({
	server,
	client,
}: {
	server: McpServer;
	client: NextpressClient;
}): void {
	const deps = { server, client };
	registerSiteTools(deps);
	registerPageTools(deps);
	registerPostTools(deps);
	registerTemplateTools(deps);
	registerMediaTools(deps);
	registerPreviewTools(deps);
	registerBlockTools(deps);
	registerPatchTools(deps);
}
