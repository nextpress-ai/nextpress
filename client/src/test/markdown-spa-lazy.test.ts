import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const markdownBlockPath = resolve(
	here,
	"../../../renderer/react/advanced/MarkdownBlock.tsx",
);

describe("SPA MarkdownBlock", () => {
	it("imports react-markdown directly for reliable preview rendering", () => {
		const source = readFileSync(markdownBlockPath, "utf8");
		expect(source).toContain('import ReactMarkdown from "react-markdown"');
		expect(source).not.toContain("React.lazy");
	});
});
