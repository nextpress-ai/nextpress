/**
 * Creates or updates a Google-style search page via the shipped SDK (dist) and blocks.
 * Run: pnpm exec tsx scripts/create-google-search-page.ts [pageId]
 */
import { buildGoogleSearchPageBlocks } from "../src/blocks/google-search-layout.js";
import { VERSION_STALE } from "../src/client/sdk-result.js";
import { loadIntegrationTestConfig } from "../src/test/integration/config.js";
import { loadShippedSdk } from "../src/test/integration/load-shipped-sdk.js";
import { waitForServerReady } from "../src/test/integration/wait-for-server.js";

const runId = Date.now().toString(36);

async function main(): Promise<void> {
	const config = await loadIntegrationTestConfig();
	if (!config) {
		throw new Error(
			"Set up src/test/integration/integration.config.ts with enabled: true and your API key.",
		);
	}

	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	const { sdk, modulePath } = await loadShippedSdk();
	const client = sdk.createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
		timeout: config.requestTimeoutMs,
	});

	const updatePageId = process.argv[2];
	const pageBlocks = buildGoogleSearchPageBlocks(client.blocks);

	let page;
	if (updatePageId) {
		const current = await client.pages.get({ id: updatePageId });
		const staleVersion = current.version ?? 0;
		const result = await client.pages.update({
			id: updatePageId,
			expectedVersion: staleVersion,
			blocks: pageBlocks,
		});
		if (result.isErr) {
			console.error(
				JSON.stringify(
					{
						ok: false,
						code: result.error.code ?? "UPDATE_FAILED",
						message: result.error.message,
						expectedVersion: staleVersion,
						hint:
							result.error.code === VERSION_STALE
								? "Remote was edited (e.g. in admin). GET fresh version and retry."
								: undefined,
					},
					null,
					2,
				),
			);
			process.exit(1);
		}
		page = result.value;
	} else {
		const result = await client.pages.create({
			title: "Google Search",
			slug: `google-search-${runId}`,
			status: "draft",
			blocks: pageBlocks,
		});
		if (result.isErr) {
			console.error(result.error.message);
			process.exit(1);
		}
		page = result.value;
	}

	const previewUrl = `${config.baseUrl.replace(/\/+$/, "")}/preview/page/${page.id}`;

	console.log(
		JSON.stringify(
			{
				ok: true,
				sdkModule: modulePath,
				pageId: page.id,
				slug: page.slug,
				title: page.title,
				status: page.status,
				version: page.version,
				blockCount: pageBlocks.length,
				previewUrl,
				adminUrl: `${config.baseUrl.replace(/\/+$/, "")}/admin/page-builder/page/${page.id}`,
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
