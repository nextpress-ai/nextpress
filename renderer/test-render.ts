import { renderBlocksToHtml, getHydrationScript } from "./to-html";
import { PageTemplate } from "./templates/page";
import type { BlockConfig } from "@shared/schema-types";

/**
 * Get test blocks data using BlockConfig directly
 */
export function getTestBlocks(): BlockConfig[] {
	return [
		{
			id: "test-1",
			name: "core/heading",
			type: "block",
			parentId: null,
			content: { kind: "text", value: "Welcome to the Demo Page", level: 1 },
		},
		{
			id: "test-2",
			name: "core/heading",
			type: "block",
			parentId: null,
			content: { kind: "text", value: "This is a static heading" },
		},
		{
			id: "test-3",
			name: "core/counter",
			type: "block",
			parentId: null,
			content: { kind: "structured", data: { initialCount: 5 } },
			isReactive: true,
		},
		{
			id: "test-4",
			name: "core/heading",
			type: "block",
			parentId: null,
			content: { kind: "text", value: "Another static heading after interactive block" },
		},
		{
			id: "test-5",
			name: "core/counter",
			type: "block",
			parentId: null,
			content: { kind: "structured", data: { initialCount: 10 } },
			isReactive: true,
		},
	];
}

/**
 * Render test page HTML
 */
export function renderTestPage(
	baseUrl: string = "http://localhost:3001/test",
): string {
	const blocks = getTestBlocks();
	const blockContentHtml = renderBlocksToHtml(blocks);
	const hydrateScript = getHydrationScript();

	return PageTemplate(
		"Renderer Test Page",
		"Testing the island architecture renderer with static and interactive blocks",
		baseUrl,
		"", // headScripts
		blockContentHtml,
		"", // bodyScripts
		hydrateScript,
	);
}

/**
 * Test script to see HTML output in console
 */
export function testRenderer() {
	const blocks = getTestBlocks();
	const blockContentHtml = renderBlocksToHtml(blocks);

	console.log("=".repeat(80));
	console.log("BLOCK CONTENT HTML OUTPUT:");
	console.log("=".repeat(80));
	console.log(blockContentHtml);
	console.log("=".repeat(80));
	console.log("\n");

	// Get hydration script
	const hydrateScript = getHydrationScript();
	console.log("HYDRATION SCRIPT:");
	console.log(hydrateScript);
	console.log("\n");

	// Create full page HTML
	const fullPageHtml = renderTestPage("http://localhost:3000/test");

	console.log("=".repeat(80));
	console.log("FULL PAGE HTML OUTPUT:");
	console.log("=".repeat(80));
	console.log(fullPageHtml);
	console.log("=".repeat(80));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	testRenderer();
}