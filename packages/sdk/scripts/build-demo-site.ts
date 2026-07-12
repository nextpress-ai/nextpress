/**
 * Builds a sample landing page via the SDK and prints preview URLs.
 * Requires integration.config.ts (copy from integration.config.example.ts).
 *
 * Run: pnpm exec tsx scripts/build-demo-site.ts
 */
import { loadIntegrationTestConfig } from "../src/test/integration/config.js";
import { loadShippedSdk } from "../src/test/integration/load-shipped-sdk.js";
import { waitForServerReady } from "../src/test/integration/wait-for-server.js";

const runId = Date.now().toString(36);

async function main(): Promise<void> {
	const config = await loadIntegrationTestConfig();
	if (!config) {
		throw new Error(
			"Copy src/test/integration/integration.config.example.ts to integration.config.ts, set enabled: true, and add your API key.",
		);
	}

	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	const { sdk } = await loadShippedSdk();
	const client = sdk.createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
		timeout: config.requestTimeoutMs,
	});

	const { blocks } = client;

	const landingBlocks = [
		blocks.cover({
			content: {
				url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600",
				alt: "Modern workspace",
				minHeight: 420,
				dimRatio: 45,
				innerContent: "<h1>Built with @nextpress-org/sdk</h1><p>Programmatic page builder demo</p>",
			},
		}),
		blocks.spacer({ content: { height: "32px" } }),
		blocks.container({
			children: [
				blocks.heading({ text: "Why NextPress SDK?", level: 2 }),
				blocks.paragraph({
					text: "Create pages, posts, and block layouts from scripts, CI, or MCP agents — the same blocks the dashboard uses.",
				}),
				blocks.columns({
					columnCount: 3,
					settings: { styles: { gap: "24px" } },
					children: [
						blocks.group({
							children: [
								blocks.heading({ text: "Pages", level: 3 }),
								blocks.paragraph({ text: "Full block trees with save, preview, and publish workflows." }),
							],
						}),
						blocks.group({
							children: [
								blocks.heading({ text: "Posts", level: 3 }),
								blocks.paragraph({ text: "Blog posts with the same page builder blocks as pages." }),
							],
						}),
						blocks.group({
							children: [
								blocks.heading({ text: "Blocks", level: 3 }),
								blocks.paragraph({ text: "39 typed block helpers matching the admin registry." }),
							],
						}),
					],
				}),
			],
		}),
		blocks.spacer({ content: { height: "24px" } }),
		blocks.buttons({
			children: [
				blocks.button({ text: "Get started", url: "/admin", linkTarget: "_self" }),
				blocks.button({
					text: "View docs",
					url: "https://github.com/nextpress-org/nextpress",
					linkTarget: "_blank",
					styles: { backgroundColor: "#1e293b", color: "#ffffff", padding: "12px 24px", borderRadius: "4px" },
				}),
			],
		}),
		blocks.separator(),
		blocks.quote({
			text: "If you can build it in the dashboard, you can build it with the SDK.",
		}),
	];

	const createResult = await client.pages.create({
		title: `SDK Demo Landing ${runId}`,
		slug: `sdk-demo-${runId}`,
		status: "preview",
		blocks: landingBlocks,
	});
	if (createResult.isErr) {
		throw createResult.error;
	}
	const page = createResult.value;

	const updateResult = await client.pages.update({
		id: page.id,
		expectedVersion: page.version ?? 0,
		blocks: landingBlocks,
	});
	if (updateResult.isErr) {
		throw updateResult.error;
	}
	const previewPayload = await client.preview.page({ id: page.id });

	const baseUrl = config.baseUrl.replace(/\/+$/, "");
	const previewUrl = `${baseUrl}/preview/page/${page.id}`;

	console.log(
		JSON.stringify(
			{
				ok: true,
				pageId: page.id,
				slug: page.slug,
				title: previewPayload.title,
				blockCount: previewPayload.blocks?.length ?? 0,
				previewUrl,
				publicUrl: `${baseUrl}/page/${page.slug}`,
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
