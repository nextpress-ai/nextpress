import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createNextpress, type NextpressClient } from "@nextpress-org/sdk";
import { createMcpServer } from "../../create-mcp-server.js";
import type { IntegrationTestConfig } from "./integration.types.js";
import { waitForServerReady } from "./wait-for-server.js";

export type IntegrationMcpContext = {
	config: IntegrationTestConfig;
	sdkClient: NextpressClient;
	mcpClient: Client;
	close: () => Promise<void>;
};

/**
 * Wait for live NextPress, build SDK client from shipped workspace package,
 * then link an in-process MCP client over InMemoryTransport (same tools Cursor would call).
 */
export const createIntegrationMcpSession = async ({
	config,
}: {
	config: IntegrationTestConfig;
}): Promise<IntegrationMcpContext> => {
	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	const sdkClient = createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
		timeout: config.requestTimeoutMs,
	});

	await sdkClient.auth.me();

	const mcpServer = createMcpServer({ client: sdkClient });
	const mcpClient = new Client({ name: "mcp-integration", version: "0.0.0" });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

	await Promise.all([
		mcpClient.connect(clientTransport),
		mcpServer.server.connect(serverTransport),
	]);

	return {
		config,
		sdkClient,
		mcpClient,
		close: async () => {
			await mcpClient.close();
			await mcpServer.close();
		},
	};
};

export const parseToolJson = (result: {
	content: Array<{ type: string; text?: string }>;
}): Record<string, unknown> => {
	const block = result.content.find((item) => item.type === "text");
	if (!block?.text) {
		throw new Error("MCP tool returned no text content");
	}
	return JSON.parse(block.text) as Record<string, unknown>;
};
