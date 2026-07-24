import { describe, expect, it, vi } from "vitest";
import { createMcpServer, MCP_SERVER_NAME } from "./create-mcp-server.js";
import type { NextpressClient } from "@nextpress-org/sdk";

describe("createMcpServer", () => {
	it("registers content-core tools without calling the network", () => {
		const client = {
			blocks: { names: [] },
			site: { get: vi.fn() },
			themes: { getActive: vi.fn() },
			settings: { get: vi.fn() },
			health: { check: vi.fn() },
			pages: {
				list: vi.fn(),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				patchBlocks: vi.fn(),
			},
			posts: {
				list: vi.fn(),
				get: vi.fn(),
				create: vi.fn(),
				update: vi.fn(),
				patchBlocks: vi.fn(),
			},
			templates: { list: vi.fn(), get: vi.fn() },
			media: { list: vi.fn(), upload: vi.fn() },
			preview: {
				createShareToken: vi.fn(),
				buildSharePreviewUrl: vi.fn(),
			},
		} as unknown as NextpressClient;

		const server = createMcpServer({ client });
		expect(server).toBeTruthy();
		expect(MCP_SERVER_NAME).toBe("nextpress");
	});
});
