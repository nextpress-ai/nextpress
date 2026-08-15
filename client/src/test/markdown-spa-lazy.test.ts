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
	it("keeps react-markdown behind React.lazy", () => {
		const source = readFileSync(markdownBlockPath, "utf8");
		expect(source).toContain('React.lazy(() => import("react-markdown"))');
		expect(source).not.toMatch(/import\s+ReactMarkdown\s+from\s+["']react-markdown["']/);
		expect(source).not.toMatch(/import\s+["']react-markdown["']/);
	});
});
