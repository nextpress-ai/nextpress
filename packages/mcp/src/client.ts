import { createNextpress, type NextpressClient } from "@nextpress-org/sdk";
import type { McpRuntimeConfig } from "./parse-config.js";

/**
 * Build the SDK client used by every MCP tool and resource.
 */
export function createMcpClient(config: McpRuntimeConfig): NextpressClient {
	return createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
	});
}
