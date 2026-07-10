/**
 * E2E: simulate admin edit then stale agent update (VERSION_STALE).
 */
import { VERSION_STALE } from "../src/client/sdk-result.js";
import { loadIntegrationTestConfig } from "../src/test/integration/config.js";
import { loadShippedSdk } from "../src/test/integration/load-shipped-sdk.js";
import { waitForServerReady } from "../src/test/integration/wait-for-server.js";

const pageId = process.argv[2];
if (!pageId) {
	console.error("Usage: tsx scripts/e2e-version-conflict.ts <pageId>");
	process.exit(1);
}

async function main(): Promise<void> {
	const config = await loadIntegrationTestConfig();
	if (!config) process.exit(1);

	await waitForServerReady({ baseUrl: config.baseUrl, timeoutMs: config.serverReadyTimeoutMs });

	const { sdk } = await loadShippedSdk();
	const client = sdk.createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
	});

	const page = await client.pages.get({ id: pageId });
	const cachedVersion = page.version ?? 0;

	// Simulate admin save in PageBuilder (bumps remote version).
	const adminSave = await client.pages.update({
		id: pageId,
		expectedVersion: cachedVersion,
		blocks: [
			...(page.blocks ?? []),
			client.blocks.paragraph({ text: "Edited in admin UI" }),
		],
	});
	if (adminSave.isErr) {
		console.error("Admin save simulation failed:", adminSave.error.message);
		process.exit(1);
	}

	// Agent still holds stale cachedVersion — must fail.
	const stale = await client.pages.update({
		id: pageId,
		expectedVersion: cachedVersion,
		blocks: page.blocks ?? [],
	});

	if (stale.isErr && stale.error.code === VERSION_STALE) {
		console.log(
			JSON.stringify({ ok: true, scenario: "VERSION_STALE", pageId, cachedVersion }, null, 2),
		);
		return;
	}

	console.error(JSON.stringify({ ok: false, stale }, null, 2));
	process.exit(1);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
