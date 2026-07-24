import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createNextpress, validateBlockTree } from "../packages/sdk/src/index.ts";
import { createMcpServer } from "../packages/mcp/src/create-mcp-server.ts";
import { loadIntegrationTestConfig } from "../packages/mcp/src/test/integration/config.ts";
import { integrationConfig as sdkConfig } from "../packages/sdk/src/test/integration/integration.config.ts";

async function probeKey(label: string, baseUrl: string, apiKey: string, siteId: string) {
	const headers = { Authorization: `Bearer ${apiKey}` };
	const meRes = await fetch(`${baseUrl}/api/auth/user`, { headers });
	const meBody = await meRes.json().catch(() => ({}));
	const pagesRes = await fetch(
		`${baseUrl}/api/pages?per_page=20&status=any&siteId=${encodeURIComponent(siteId)}`,
		{ headers },
	);
	const pagesBody = await pagesRes.json().catch(() => ({}));
	return {
		label,
		baseUrl,
		authMe: {
			status: meRes.status,
			hasEmail: Boolean((meBody as { email?: string }).email),
			message:
				(meBody as { message?: string }).message ||
				(meBody as { error?: string }).error ||
				null,
		},
		pages: {
			status: pagesRes.status,
			total: (pagesBody as { total?: number }).total ?? null,
			pageCount: Array.isArray((pagesBody as { pages?: unknown[] }).pages)
				? (pagesBody as { pages: unknown[] }).pages.length
				: null,
			message:
				(pagesBody as { message?: string }).message ||
				(pagesBody as { error?: string }).error ||
				null,
		},
	};
}

function toolJson(result: { content: Array<{ type: string; text?: string }> }) {
	const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
	return JSON.parse(text) as Record<string, unknown>;
}

async function liveSdkAndMcp(apiKey: string, siteId: string, baseUrl: string) {
	const client = createNextpress({ baseUrl, apiKey, siteId });
	const runId = Date.now().toString(36);
	const created = await client.pages.create({
		title: `Live verify ${runId}`,
		slug: `live-verify-${runId}`,
		status: "draft",
		blocks: [
			client.blocks.heading({ text: "Before patch", level: 1 }),
			client.blocks.paragraph({ text: "Original body" }),
		],
	});
	if (created.isErr) {
		return { step: "create", ok: false, code: created.error.code, message: created.error.message };
	}
	const page = created.value;
	const validation = validateBlockTree(page.blocks ?? []);
	const para = client.blocks.paragraph({ text: `Patched live ${runId}` });

	const inserted = await client.pages.patchBlocks({
		id: page.id,
		expectedVersion: page.version ?? 0,
		ops: [{ op: "insert", parentId: null, block: para }],
	});
	if (inserted.isErr) {
		await client.pages.delete({ id: page.id }).catch(() => undefined);
		return {
			step: "sdkInsert",
			ok: false,
			code: inserted.error.code,
			message: inserted.error.message,
		};
	}

	const updated = await client.pages.patchBlocks({
		id: page.id,
		expectedVersion: inserted.value.entity.version ?? 0,
		ops: [
			{
				op: "update",
				id: para.id,
				set: { content: { kind: "text", value: `Updated ${runId}` } },
			},
		],
	});
	if (updated.isErr) {
		await client.pages.delete({ id: page.id }).catch(() => undefined);
		return {
			step: "sdkUpdate",
			ok: false,
			code: updated.error.code,
			message: updated.error.message,
		};
	}

	const unknownReject = await client.pages.update({
		id: page.id,
		expectedVersion: updated.value.entity.version ?? 0,
		blocks: [
			{
				id: "bad-block",
				name: "core/not-a-real-block",
				type: "block",
				parentId: null,
				content: { kind: "text", value: "nope" },
			},
		],
	});

	const mcpServer = createMcpServer({ client });
	const mcpClient = new Client({ name: "live-verify", version: "0.0.0" });
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	await Promise.all([
		mcpClient.connect(clientTransport),
		mcpServer.server.connect(serverTransport),
	]);

	const mcpGet = await mcpClient.callTool({
		name: "get_page",
		arguments: { id: page.id },
	});
	const mcpPage = toolJson(mcpGet as { content: Array<{ type: string; text?: string }> });
	const extra = client.blocks.paragraph({ text: `MCP insert ${runId}` });
	const mcpPatch = await mcpClient.callTool({
		name: "patch_page_blocks",
		arguments: {
			id: page.id,
			expectedVersion: (mcpPage.version as number | undefined) ?? 0,
			ops: [{ op: "insert", parentId: null, block: extra }],
		},
	});
	const mcpBody = toolJson(mcpPatch as { content: Array<{ type: string; text?: string }> });

	await mcpClient.close();
	await mcpServer.close();
	await client.pages.delete({ id: page.id }).catch(() => undefined);

	return {
		step: "done",
		ok: true && !mcpPatch.isError,
		validateOk: validation.ok,
		sdkInsert: inserted.value.summary,
		sdkUpdate: updated.value.summary,
		blocksAfterSdkUpdate: (updated.value.entity.blocks ?? []).length,
		unknownBlockRejected: unknownReject.isErr,
		unknownCode: unknownReject.isErr ? unknownReject.error.code : null,
		unknownStatus: unknownReject.isErr ? unknownReject.error.status : null,
		mcpPatch: {
			isError: Boolean(mcpPatch.isError),
			inserted: Array.isArray((mcpBody.summary as { inserted?: string[] } | undefined)?.inserted)
				? ((mcpBody.summary as { inserted: string[] }).inserted.length)
				: 0,
			errorCode: (mcpBody.code as string | undefined) ?? null,
		},
	};
}

async function main() {
	const health = await fetch("http://localhost:5000/api/health").then(async (r) => ({
		status: r.status,
		body: await r.json().catch(() => ({})),
	}));
	const setup = await fetch("http://localhost:5000/api/setup/status").then(async (r) =>
		r.json(),
	);

	const sdkProbe = await probeKey(
		"sdk-integration.config",
		sdkConfig.baseUrl.replace(/\/+$/, ""),
		sdkConfig.apiKey,
		sdkConfig.siteId,
	);

	const mcpCfg = await loadIntegrationTestConfig();
	const mcpProbe = mcpCfg
		? await probeKey("mcp-loadIntegrationTestConfig", mcpCfg.baseUrl, mcpCfg.apiKey, mcpCfg.siteId)
		: null;

	const working =
		mcpProbe?.authMe.status === 200
			? mcpCfg
			: sdkProbe.authMe.status === 200
				? {
						baseUrl: sdkConfig.baseUrl.replace(/\/+$/, ""),
						apiKey: sdkConfig.apiKey,
						siteId: sdkConfig.siteId,
					}
				: null;

	const live = working
		? await liveSdkAndMcp(working.apiKey, working.siteId, working.baseUrl)
		: { ok: false, step: "no-working-key" };

	console.log(
		JSON.stringify(
			{
				health,
				setup,
				sdkProbe,
				mcpProbe,
				usedKeySource:
					working === mcpCfg ? "mcp-config" : working ? "sdk-config" : "none",
				live,
			},
			null,
			2,
		),
	);
}

main().catch((error: Error) => {
	console.error(JSON.stringify({ fatal: error.message }));
	process.exit(1);
});
