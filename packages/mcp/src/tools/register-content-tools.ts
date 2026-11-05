import { registerBlogTools } from "./blog-tools.js";
import { registerBlockTools } from "./block-tools.js";
import { registerDocsPageTools } from "./docs-page-tools.js";
import { registerDocsTools } from "./docs-tools.js";
import { registerFormTools } from "./form-tools.js";
import { registerHistoryTools } from "./history-tools.js";
import { registerMediaTools } from "./media-tools.js";
import { registerPageEditingTools } from "./page-editing-tools.js";
import { registerPageTools } from "./page-tools.js";
import { registerPatchTools } from "./patch-tools.js";
import { registerPostTools } from "./post-tools.js";
import { registerPreviewTools } from "./preview-tools.js";
import { registerSiteTools } from "./site-tools.js";
import { registerTemplatePartTools } from "./template-part-tools.js";
import { registerTemplateTools } from "./template-tools.js";
import { registerThemeTools } from "./theme-tools.js";
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
	registerBlogTools(deps);
	registerPageTools(deps);
	registerPostTools(deps);
	registerTemplateTools(deps);
	registerTemplatePartTools(deps);
	registerThemeTools(deps);
	registerMediaTools(deps);
	registerPreviewTools(deps);
	registerBlockTools(deps);
	registerPageEditingTools(deps);
	registerPatchTools(deps);
	registerHistoryTools(deps);
	registerFormTools(deps);
	registerDocsTools(deps);
	registerDocsPageTools(deps);
}
