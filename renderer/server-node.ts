import { createServer } from "http";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { renderBlocksToHtml, getHydrationScript } from "./to-html";
import { PageTemplate } from "./templates/page";
import type { BlockConfig } from "@shared/schema-types";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = 3001;

// Sample blocks data using BlockConfig directly
function getTestBlocks(): BlockConfig[] {
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

const server = createServer((req, res) => {
	const url = new URL(req.url || "/", `http://${req.headers.host}`);

	// CORS headers
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

	if (req.method === "OPTIONS") {
		res.writeHead(200);
		res.end();
		return;
	}

	// Serve hydrate script
	if (url.pathname === "/renderer/scripts/hydrate.js") {
		const hydratePath = join(__dirname, "scripts", "hydrate.js");
		const content = readFileSync(hydratePath, "utf-8");
		res.writeHead(200, { "Content-Type": "application/javascript" });
		res.end(content);
		return;
	}

	// Serve block-components as ESM
	if (url.pathname === "/renderer/react/block-components.js") {
		const blockComponentsCode = `
			import * as React from "https://esm.sh/react@18.3.1";
			import Counter from "/renderer/react/counter.js";

			const Heading = (props) => {
				const { content, level, className } = props;
				const Tag = \`h\${level}\`;
				return React.createElement(Tag, { className }, content);
			};

			const CounterBlock = (props) => {
				const { initialCount } = props;
				return React.createElement(Counter, { initialCount });
			};

			export const BLOCK_COMPONENTS = {
				"core/heading": Heading,
				"core/counter": CounterBlock,
			};
		`;
		res.writeHead(200, { "Content-Type": "application/javascript" });
		res.end(blockComponentsCode);
		return;
	}

	// Serve counter component as ESM
	if (url.pathname === "/renderer/react/counter.js") {
		const counterCode = `
			import * as React from "https://esm.sh/react@18.3.1";

			const Counter = ({ initialCount }) => {
				const [count, setCount] = React.useState(initialCount);
				return React.createElement(
					"div",
					{ className: "interactive-counter" },
					React.createElement("p", null, \`Current Count: \${count}\`),
					React.createElement(
						"button",
						{
							onClick: () => setCount((c) => c + 1),
							type: "button",
						},
						"Increment"
					)
				);
			};

			export default Counter;
		`;
		res.writeHead(200, { "Content-Type": "application/javascript" });
		res.end(counterCode);
		return;
	}

	// Test endpoint
	if (url.pathname === "/test" || url.pathname === "/") {
		const blocks = getTestBlocks();
		const blockContentHtml = renderBlocksToHtml(blocks);
		const hydrateScript = getHydrationScript();
		const html = PageTemplate(
			"Renderer Test Page",
			"Testing the island architecture renderer with static and interactive blocks",
			`http://localhost:${PORT}/test`,
			"",
			blockContentHtml,
			"",
			hydrateScript,
		);

		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(html);
		return;
	}

	// API endpoint
	if (url.pathname === "/api/info") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				message: "Renderer test server",
				endpoints: {
					test: "/test - View rendered blocks with hydration",
				},
			}),
		);
		return;
	}

	// 404
	res.writeHead(404, { "Content-Type": "text/plain" });
	res.end("Not Found");
});

server.listen(PORT, () => {
	console.log(`🚀 Renderer test server running on http://localhost:${PORT}`);
	console.log(`📄 Test page: http://localhost:${PORT}/test`);
});