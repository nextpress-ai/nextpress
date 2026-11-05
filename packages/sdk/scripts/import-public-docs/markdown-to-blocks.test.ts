import { describe, expect, it } from "vitest";
import { markdownToBlocks } from "./markdown-to-blocks.js";
import { readFrontMatter } from "./read-docs-folder.js";

const counter = () => {
	let n = 0;
	return () => `id-${++n}`;
};
const convert = (markdown: string) => markdownToBlocks({ markdown, newId: counter() });

describe("the public docs converter", () => {
	it("turns headings, paragraphs and inline marks into the normal blocks", () => {
		const { blocks } = convert("# Title\n\nUse **pnpm** and `node`.\n\n## Section\n\n#### Deep");
		expect(blocks.map((b) => b.name)).toEqual(["core/paragraph", "core/heading", "core/heading"]);
		expect(blocks[0].content).toMatchObject({ kind: "text", format: "html", value: "Use <strong>pnpm</strong> and <code>node</code>." });
		expect(blocks[1].content).toMatchObject({ level: 2, value: "Section" });
	});

	it("makes lists, tables, code, diagrams and quotes", () => {
		const { blocks, warnings } = convert("- One\n  - Nested\n- Two\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts title=\"a.ts\"\nconst a = 1;\n```\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n> Careful");
		expect(blocks.map((b) => b.name)).toEqual(["core/list", "core/table", "core/code", "docs/diagram", "core/quote"]);
		expect(blocks[0].content).toMatchObject({ data: { ordered: false, values: "<li>One<ul><li>Nested</li></ul></li><li>Two</li>" } });
		expect(blocks[1].content).toMatchObject({ data: { head: [{ cells: [{ content: "A", tag: "th" }, { content: "B", tag: "th" }] }], body: [{ cells: [{ content: "1", tag: "td" }, { content: "2", tag: "td" }] }] } });
		expect(blocks[2].content).toMatchObject({ data: { language: "ts", title: "a.ts", content: "const a = 1;" } });
		expect(warnings).toEqual([]);
	});

	it("turns a numbered list with code in its steps into Steps, keeping the code inside the step", () => {
		const { blocks } = convert("1. Run this:\n\n   ```bash\n   pnpm i\n   ```\n\n2. Open the app.\n");
		expect(blocks).toHaveLength(1);
		expect(blocks[0].name).toBe("core/steps");
		expect(blocks[0].children?.map((step) => step.name)).toEqual(["core/step", "core/step"]);
		expect(blocks[0].children?.[0].children?.map((child) => child.name)).toEqual(["core/code"]);
		expect(blocks[0].children?.[0].content).toMatchObject({ data: { title: "Run this" } });
		expect(blocks[0].children?.[0].children?.[0].parentId).toBe(blocks[0].children?.[0].id);
	});

	it("reads front matter", () => {
		expect(readFrontMatter("---\ntitle: \"Hi\"\ndescription: A page\norder: 3\n---\nBody")).toEqual({ meta: { title: "Hi", description: "A page", order: 3 }, body: "Body" });
	});
});
