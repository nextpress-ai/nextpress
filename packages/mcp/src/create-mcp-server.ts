import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { NextpressClient } from "@nextpress-org/sdk";
import { registerContentTools } from "./tools/register-content-tools.js";
import { registerContentResources } from "./resources/register-content-resources.js";

export const MCP_SERVER_NAME = "nextpress";
export const MCP_SERVER_VERSION = "0.2.1";

/**
 * Create the NextPress MCP server with content-core tools and resources.
 * No business logic here — tools map straight to the SDK client.
 */
export function createMcpServer({ client }: { client: NextpressClient }): McpServer {
	const server = new McpServer({
		name: MCP_SERVER_NAME,
		version: MCP_SERVER_VERSION,
	});

	registerContentTools({ server, client });
	registerContentResources({ server, client });

	return server;
}
