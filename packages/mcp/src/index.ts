import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpClient } from "./client.js";
import { createMcpServer, MCP_SERVER_VERSION } from "./create-mcp-server.js";
import { parseMcpConfig } from "./parse-config.js";

export { createMcpClient } from "./client.js";
export { createMcpServer, MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./create-mcp-server.js";
export { parseMcpConfig, type McpRuntimeConfig } from "./parse-config.js";
export { buildBlocksFromNodes, type BlockBuildNode } from "./build-blocks.js";
export {
	formatError,
	formatJson,
	formatSdkResult,
	runTool,
	type McpTextResult,
} from "./format-result.js";

async function main(): Promise<void> {
	const argv = process.argv.slice(2);

	if (argv.includes("--help") || argv.includes("-h")) {
		printHelp();
		process.exit(0);
	}

	if (argv.includes("--version") || argv.includes("-v")) {
		console.error(`@nextpress-org/mcp ${MCP_SERVER_VERSION}`);
		process.exit(0);
	}

	const config = parseMcpConfig({ argv, env: process.env });
	const client = createMcpClient(config);
	const server = createMcpServer({ client });
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

function printHelp(): void {
	console.error(`nextpress-mcp — MCP server for NextPress CMS

Usage:
  nextpress-mcp [--url URL] [--api-key KEY] [--site-id UUID]

Env:
  NEXTPRESS_URL       Base URL of your NextPress instance (required)
  NEXTPRESS_API_KEY   Bearer API key npk_live_… (required)
  NEXTPRESS_SITE_ID   Site UUID matching the API key (required)

Mint keys in the dashboard: Settings → System → API Keys.
Prefer the editor scope so agents edit drafts while owners keep CMS control.

Flags override env when both are set.
`);
}

main().catch((error: Error) => {
	console.error(error.message);
	process.exit(1);
});
