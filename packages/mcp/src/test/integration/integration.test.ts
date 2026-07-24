import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { VERSION_STALE } from "@nextpress-org/sdk";
import {
	createIntegrationMcpSession,
	parseToolJson,
	type IntegrationMcpContext,
} from "./bootstrap-integration-mcp.js";
import { loadIntegrationTestConfig } from "./config.js";

const integrationConfig = await loadIntegrationTestConfig();
const integration = integrationConfig ? describe : describe.skip;

integration("integration @nextpress-org/mcp + real API key", () => {
	let ctx: IntegrationMcpContext;
	let createdPageId: string | undefined;
	const runId = Date.now().toString(36);

	beforeAll(async () => {
		if (!integrationConfig) {
			throw new Error("integration.config missing or enabled: false (MCP or SDK package)");
		}
		ctx = await createIntegrationMcpSession({ config: integrationConfig });
	}, 120_000);

	afterAll(async () => {
		if (!ctx) return;
		if (createdPageId) {
			await ctx.sdkClient.pages.delete({ id: createdPageId }).catch(() => undefined);
		}
		await ctx.close();
	});

	it("lists content-core tools against a live-authenticated session", async () => {
		const tools = await ctx.mcpClient.listTools();
		const names = tools.tools.map((tool) => tool.name);
		expect(names).toContain("get_site_context");
		expect(names).toContain("create_page");
		expect(names).toContain("build_blocks");
		expect(names).toContain("preview_page");
	});

	it("get_site_context hits live site/theme/settings/health", async () => {
		const result = await ctx.mcpClient.callTool({
			name: "get_site_context",
			arguments: {},
		});
		expect(result.isError).toBeFalsy();
		const body = parseToolJson(result as { content: Array<{ type: string; text?: string }> });
		expect(body.health).toBeTruthy();
		expect(body.site).toBeTruthy();
	});

	it("build_blocks → create_page draft → get_page → update_page on live API", async () => {
		const built = await ctx.mcpClient.callTool({
			name: "build_blocks",
			arguments: {
				blocks: [
					{ name: "core/heading", text: `MCP Integration ${runId}`, level: 1 },
					{ name: "core/paragraph", text: "Live MCP page body" },
				],
			},
		});
		expect(built.isError).toBeFalsy();
		const builtBody = parseToolJson(
			built as { content: Array<{ type: string; text?: string }> },
		) as { blocks: unknown[] };
		expect(builtBody.blocks.length).toBe(2);

		const created = await ctx.mcpClient.callTool({
			name: "create_page",
			arguments: {
				title: `MCP Integration Page ${runId}`,
				slug: `mcp-int-page-${runId}`,
				blocks: builtBody.blocks,
			},
		});
		expect(created.isError).toBeFalsy();
		const page = parseToolJson(
			created as { content: Array<{ type: string; text?: string }> },
		) as { id: string; status: string; version?: number; title: string };
		createdPageId = page.id;
		expect(page.status).toBe("draft");
		expect(page.title).toContain("MCP Integration Page");

		const fetched = await ctx.mcpClient.callTool({
			name: "get_page",
			arguments: { id: page.id },
		});
		expect(fetched.isError).toBeFalsy();
		const got = parseToolJson(
			fetched as { content: Array<{ type: string; text?: string }> },
		) as { id: string; version?: number };
		expect(got.id).toBe(page.id);

		const updated = await ctx.mcpClient.callTool({
			name: "update_page",
			arguments: {
				id: page.id,
				expectedVersion: got.version ?? page.version ?? 0,
				title: `MCP Integration Page Updated ${runId}`,
			},
		});
		expect(updated.isError).toBeFalsy();
		const after = parseToolJson(
			updated as { content: Array<{ type: string; text?: string }> },
		) as { title: string };
		expect(after.title).toContain("Updated");
	});

	it("rejects stale update_page with VERSION_STALE hint", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId");
		}
		const stale = await ctx.mcpClient.callTool({
			name: "update_page",
			arguments: {
				id: createdPageId,
				expectedVersion: 0,
				title: "Should conflict",
			},
		});
		expect(stale.isError).toBe(true);
		const body = parseToolJson(
			stale as { content: Array<{ type: string; text?: string }> },
		) as { code?: string; hint?: string };
		expect(body.code).toBe(VERSION_STALE);
		expect(body.hint).toMatch(/expectedVersion/);
	});

	it("preview_page returns a share URL on the live API", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId");
		}
		const preview = await ctx.mcpClient.callTool({
			name: "preview_page",
			arguments: { id: createdPageId, expiresInSeconds: 600 },
		});
		expect(preview.isError).toBeFalsy();
		const body = parseToolJson(
			preview as { content: Array<{ type: string; text?: string }> },
		) as { previewUrl?: string; token?: string };
		expect(body.token).toBeTruthy();
		expect(body.previewUrl).toMatch(/preview/);
	});

	it("patch_page_blocks inserts a paragraph without replacing the whole tree", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId");
		}
		const fetched = await ctx.mcpClient.callTool({
			name: "get_page",
			arguments: { id: createdPageId },
		});
		const page = parseToolJson(
			fetched as { content: Array<{ type: string; text?: string }> },
		) as { version?: number; blocks?: Array<{ id: string }> };
		const built = await ctx.mcpClient.callTool({
			name: "build_blocks",
			arguments: {
				blocks: [{ name: "core/paragraph", text: `Patched via MCP ${runId}` }],
			},
		});
		const builtBody = parseToolJson(
			built as { content: Array<{ type: string; text?: string }> },
		) as { blocks: Array<Record<string, unknown>> };

		const patched = await ctx.mcpClient.callTool({
			name: "patch_page_blocks",
			arguments: {
				id: createdPageId,
				expectedVersion: page.version ?? 0,
				ops: [
					{
						op: "insert",
						parentId: null,
						block: builtBody.blocks[0],
					},
				],
			},
		});
		expect(patched.isError).toBeFalsy();
		const patchBody = parseToolJson(
			patched as { content: Array<{ type: string; text?: string }> },
		) as { summary: { inserted: string[] }; page: { blocks: unknown[] } };
		expect(patchBody.summary.inserted).toHaveLength(1);
		expect((patchBody.page.blocks as unknown[]).length).toBeGreaterThan(
			(page.blocks ?? []).length,
		);
	});

	it("reads nextpress://site/map resource from live lists", async () => {
		const resource = await ctx.mcpClient.readResource({
			uri: "nextpress://site/map",
		});
		const text = resource.contents[0]?.text;
		expect(text).toBeTruthy();
		const body = JSON.parse(text as string) as {
			pages: Array<{ id: string }>;
		};
		expect(Array.isArray(body.pages)).toBe(true);
		if (createdPageId) {
			expect(body.pages.some((page) => page.id === createdPageId)).toBe(true);
		}
	});
});
