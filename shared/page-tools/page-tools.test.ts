import { describe, expect, it } from "vitest";
import { BLOCK_NAMES } from "../block-catalog/block-names.js";
import { PAGE_DESIGN_GUIDE } from "../block-catalog/page-design-guide.js";
import { createPageTools } from "./create-page-tools.js";
import { explainFocusRefusal, isInsideFocus } from "./focus.js";
import { findBlockById } from "./tree-find.js";
import { createMemoryContext, findTool, makeBlock, makeParagraph, makeSamplePage } from "./test-support/memory-context.js";

const run = async ({ tool, input = {}, ...memoryParams }: { tool: string; input?: Record<string, unknown> } & Parameters<typeof createMemoryContext>[0]) => {
	const memory = createMemoryContext(memoryParams);
	const result = await findTool(createPageTools(memory.ctx), tool).run(input);
	return { ...memory, result };
};

describe("createPageTools", () => {
	it("lists the tools in a fixed order, with the site tools only when the host gave the lookup", () => {
		const bare = createPageTools(createMemoryContext({ blocks: [] }).ctx).map((tool) => tool.name);
		expect(bare).toEqual([
			"get_page_outline",
			"get_block",
			"list_block_types",
			"get_block_type",
			"change_blocks",
			"check_page",
			"apply_phone_fixes",
			"get_design_guide",
		]);

		const some = createPageTools(
			createMemoryContext({ blocks: [], site: { listPages: async () => [], getTheme: async () => ({ name: "T", colors: {} }) } }).ctx,
		).map((tool) => tool.name);
		expect(some.slice(8)).toEqual(["list_pages", "get_theme"]);

		const all = createPageTools(
			createMemoryContext({
				blocks: [],
				site: {
					listMedia: async () => [],
					listPages: async () => [],
					listTemplateParts: async () => [],
					getTheme: async () => ({ name: "T", colors: {} }),
				},
			}).ctx,
		).map((tool) => tool.name);
		expect(all.slice(8)).toEqual(["list_media", "list_pages", "list_template_parts", "get_theme"]);
	});

	it("gives every tool a snake_case name, a description and an input shape, and marks only the changing tools", () => {
		const tools = createPageTools(createMemoryContext({ blocks: [], site: { listPages: async () => [] } }).ctx);
		for (const tool of tools) {
			expect(tool.name).toMatch(/^[a-z]+(_[a-z]+)*$/);
			expect(tool.description.length).toBeGreaterThan(60);
			expect(typeof tool.inputShape).toBe("object");
		}
		expect(tools.filter((tool) => tool.changesPage).map((tool) => tool.name)).toEqual(["change_blocks", "apply_phone_fixes"]);
	});

	it("checks every tool's input and never throws on a wrong one", async () => {
		const memory = createMemoryContext({ blocks: makeSamplePage() });
		const tools = createPageTools(memory.ctx);
		const wrongInput = { id: 42, name: [], ops: "x", search: 3, limit: "many" };
		for (const tool of tools) {
			const outcome = await tool.run(wrongInput).then(
				(result) => result,
				() => "threw",
			);
			expect(outcome).not.toBe("threw");
		}
		const getBlock = await findTool(tools, "get_block").run({});
		expect(getBlock).toEqual({ ok: false, text: expect.stringContaining("id: Required") });
	});
});

describe("read tools", () => {
	it("get_page_outline gives the count, the selection and the outline", async () => {
		const { result } = await run({ tool: "get_page_outline", blocks: makeSamplePage(), focusBlockId: "hero" });
		expect(result.ok).toBe(true);
		expect(result.text.split("\n")[0]).toBe("Page: 5 blocks. Selected block: id hero. Changes are limited to it and what is inside it.");
		expect(result.text).toContain('stack id=hero label="Hero" stack=vertical ← selected');
	});

	it("get_page_outline folds a very large page", async () => {
		const sections = Array.from({ length: 41 }, (_, i) =>
			makeBlock({ name: "core/stack", id: `s${i}`, children: Array.from({ length: 10 }, (_, j) => makeParagraph({ id: `p${i}-${j}`, text: "x" })) }),
		);
		const { result } = await run({ tool: "get_page_outline", blocks: [makeBlock({ name: "core/page-shell", id: "shell", children: [makeBlock({ name: "core/stack", id: "wrap", children: [makeBlock({ name: "core/group", id: "deep", children: sections })] })] })] });
		expect(result.text).toContain("Deep blocks are folded");
		expect(result.text).toContain("stack id=s0 stack=vertical (+10 inside)");
		expect(result.text).not.toContain("id=p0-0");
	});

	it("get_block returns the block's full JSON, or says which id is missing", async () => {
		const found = await run({ tool: "get_block", input: { id: "title" }, blocks: makeSamplePage() });
		expect(JSON.parse(found.result.text)).toMatchObject({ id: "title", name: "core/heading", parentId: "hero" });
		const missing = await run({ tool: "get_block", input: { id: "ghost" }, blocks: makeSamplePage() });
		expect(missing.result).toEqual({ ok: false, text: "No block with id ghost. Read the outline again." });
	});

	it("get_block cuts a very large subtree and says so", async () => {
		const long = "lorem ".repeat(100);
		const big = makeBlock({
			name: "core/stack",
			id: "big",
			children: Array.from({ length: 60 }, (_, i) => makeParagraph({ id: `p${i}`, text: long })),
		});
		const { result } = await run({ tool: "get_block", input: { id: "big" }, blocks: [big] });
		expect(result.ok).toBe(true);
		expect(result.text).toContain("This block is large (61 blocks including its children)");
		expect(result.text).toContain("Children:");
		expect(result.text).toContain("paragraph id=p59");
		const json = result.text.split("\n")[1];
		expect(JSON.parse(json)).toMatchObject({ id: "big" });
		expect(JSON.parse(json)).not.toHaveProperty("children");
	});

	it("list_block_types lists every block once with its note", async () => {
		const { result } = await run({ tool: "list_block_types", blocks: [] });
		const lines = result.text.split("\n");
		expect(lines).toHaveLength(BLOCK_NAMES.length);
		expect(lines[0].split(" | ")).toHaveLength(5);
		for (const name of BLOCK_NAMES) expect(lines.some((line) => line.startsWith(`${name} | `))).toBe(true);
		expect(result.text).toContain("core/stack | Stack | container |");
	});

	it("list_block_types groups the docs blocks under docs, and marks the core blocks the docs group also shows", async () => {
		const { result } = await run({ tool: "list_block_types", blocks: [] });
		const rows = result.text.split("\n").map((line) => line.split(" | "));
		const names = rows.map((row) => row[0]);
		const categoryOf = (name: string): string | undefined => rows.find((row) => row[0] === name)?.[3];

		const docsBlocks = names.filter((name) => name.startsWith("docs/"));
		expect(docsBlocks).toEqual(expect.arrayContaining(["docs/callout", "docs/code-group", "docs/file-tree", "docs/params", "docs/example"]));
		for (const name of docsBlocks) expect(categoryOf(name), name).toBe("docs");
		const first = names.indexOf(docsBlocks[0]);
		expect(names.slice(first, first + docsBlocks.length)).toEqual(docsBlocks);

		const alsoInDocs = ["core/code", "core/image", "core/table", "core/tabs", "core/steps", "core/grid", "core/accordion", "core/separator", "core/markdown"];
		for (const name of alsoInDocs) expect(categoryOf(name), name).toMatch(/^[a-z]+ \(also docs\)$/);
		expect(categoryOf("core/code")).toBe("advanced (also docs)");
		expect(categoryOf("core/heading")).toBe("basic (also docs)");
		expect(categoryOf("core/button")).toBe("basic");
	});

	it("get_block_type gives the entry, its note and an example as the editor inserts it", async () => {
		const { result } = await run({ tool: "get_block_type", input: { name: "core/heading" }, blocks: [] });
		expect(result.ok).toBe(true);
		expect(result.text).toContain("core/heading: Heading.");
		expect(result.text).toContain("Kind: block (cannot hold other blocks). Category: basic (also docs).");
		expect(result.text).toContain("When to use:");
		const example = JSON.parse(result.text.split("\n").at(-1) ?? "{}");
		expect(example.content).toMatchObject({ kind: "text", value: "Your heading here", level: 2 });

		const shell = await run({ tool: "get_block_type", input: { name: "core/page-shell" }, blocks: [] });
		expect(shell.result.text).toContain("Placement: page root only");
		const accordion = await run({ tool: "get_block_type", input: { name: "core/accordion" }, blocks: [] });
		expect(JSON.parse(accordion.result.text.split("\n").at(-1) ?? "{}").children).toHaveLength(3);
	});

	it("get_block_type suggests names for a near miss", async () => {
		const { result } = await run({ tool: "get_block_type", input: { name: "core/head" }, blocks: [] });
		expect(result.ok).toBe(false);
		expect(result.text).toContain('Unknown block name "core/head". Did you mean core/heading, core/header?');
		const nothing = await run({ tool: "get_block_type", input: { name: "zzz" }, blocks: [] });
		expect(nothing.result.text).toBe('Unknown block name "zzz". Call list_block_types for the valid names.');
	});

	it("get_block_type takes a docs block by its full name and says when another group lists a block too", async () => {
		const callout = await run({ tool: "get_block_type", input: { name: "docs/callout" }, blocks: [] });
		expect(callout.result.ok).toBe(true);
		expect(callout.result.text).toContain("docs/callout: Callout.");
		expect(callout.result.text).toContain("Category: docs.");

		const code = await run({ tool: "get_block_type", input: { name: "core/code" }, blocks: [] });
		expect(code.result.text).toContain("Category: advanced (also docs).");
	});

	it("get_block_type refuses a docs block written without its prefix and suggests the full name", async () => {
		const { result } = await run({ tool: "get_block_type", input: { name: "callout" }, blocks: [] });
		expect(result).toEqual({
			ok: false,
			text: 'Unknown block name "callout". Did you mean docs/callout? Call list_block_types for the valid names.',
		});
	});

	it("get_block_type takes a name without core/, and lists the block's content fields", async () => {
		const { result } = await run({ tool: "get_block_type", input: { name: "icon" }, blocks: [] });
		expect(result.ok).toBe(true);
		expect(result.text).toMatch(/^core\/icon: /);
		expect(result.text).toContain("Content fields: icon (iconSet, iconName, size, color, strokeWidth, svg, url, label, tint, sizeUnit, strokeWidthUnit), link (text), linkTarget (text), label (text)");
	});

	it("get_design_guide returns the guide", async () => {
		const { result } = await run({ tool: "get_design_guide", blocks: [] });
		expect(result).toEqual({ ok: true, text: PAGE_DESIGN_GUIDE });
	});

	it("turns a throwing readTree into a failed result and reports the cause", async () => {
		const memory = createMemoryContext({ blocks: [] });
		memory.ctx.readTree = async () => {
			throw new Error("connection lost");
		};
		const result = await findTool(createPageTools(memory.ctx), "get_page_outline").run({});
		expect(result).toEqual({ ok: false, text: "The page could not be read: connection lost." });
		expect(memory.errors).toEqual([{ tool: "readTree", message: "connection lost" }]);
	});
});

describe("check_page and apply_phone_fixes", () => {
	it("check_page says a clean page is clean", async () => {
		const { result } = await run({ tool: "check_page", blocks: makeSamplePage() });
		expect(result).toEqual({ ok: true, text: "The page is clean: no problems found." });
	});

	it("check_page separates what must be fixed from phone warnings", async () => {
		const bad = makeBlock({ name: "core/group", id: "g", content: { kind: "structured", data: { tagName: "script" } }, styles: { width: "900px" } });
		const { result } = await run({ tool: "check_page", blocks: [bad] });
		expect(result.ok).toBe(false);
		expect(result.text.split("\n")[0]).toBe("1 problem must be fixed, plus 1 phone warning:");
		expect(result.text).toContain("[save] block g:");
		expect(result.text).toContain("[phone] block g:");

		const wide = await run({ tool: "check_page", blocks: [makeBlock({ name: "core/group", id: "w", styles: { width: "900px" } })] });
		expect(wide.result.ok).toBe(true);
		expect(wide.result.text.split("\n")[0]).toBe("The page can be saved. 1 phone warning:");
	});

	it("apply_phone_fixes repairs the page through writeTree and keeps the rest", async () => {
		const page = makeSamplePage();
		page[0].children?.push(makeBlock({ name: "core/group", id: "wide", styles: { width: "900px" } }));
		const { result, writes, getTree } = await run({ tool: "apply_phone_fixes", blocks: page });
		expect(result.ok).toBe(true);
		expect(result.text).toContain("Fixed 1 block for phones:");
		expect(writes).toHaveLength(1);
		expect(writes[0].ops).toEqual([{ op: "update", id: "wide", set: { styles: expect.objectContaining({ width: "100%", maxWidth: "900px" }) } }]);
		expect(writes[0].summary.updated).toEqual(["wide"]);
		const fixed = findBlockById({ blocks: getTree(), id: "wide" });
		expect(fixed?.styles).toMatchObject({ width: "100%", maxWidth: "900px" });
		expect(fixed?.styles?.padding).toBe(findBlockById({ blocks: page, id: "wide" })?.styles?.padding);
		expect(findBlockById({ blocks: getTree(), id: "title" })).toEqual(findBlockById({ blocks: page, id: "title" }));
	});

	it("apply_phone_fixes still works on a page that already has another problem, and names it", async () => {
		const page = makeSamplePage();
		page[0].children?.push(makeBlock({ name: "core/group", id: "bad", content: { kind: "structured", data: { tagName: "script" } } }));
		page[0].children?.push(makeBlock({ name: "core/group", id: "wide", styles: { width: "900px" } }));
		const { result, writes, getTree } = await run({ tool: "apply_phone_fixes", blocks: page });
		expect(result.ok).toBe(true);
		expect(writes).toHaveLength(1);
		expect(findBlockById({ blocks: getTree(), id: "wide" })?.styles).toMatchObject({ width: "100%", maxWidth: "900px" });
		expect(result.text).toContain("Already on the page before this change");
		expect(result.text).toContain("Invalid group tagName: script");
	});

	it("apply_phone_fixes with nothing to fix does not write", async () => {
		const { result, writes } = await run({ tool: "apply_phone_fixes", blocks: makeSamplePage() });
		expect(result).toEqual({ ok: true, text: "Nothing to fix: no phone problems found." });
		expect(writes).toHaveLength(0);
	});

	it("apply_phone_fixes with a selected block fixes only inside it", async () => {
		const page = makeSamplePage();
		page[0].children?.push(makeBlock({ name: "core/group", id: "outside", styles: { width: "900px" } }));
		page[0].children?.[0].children?.push(makeBlock({ name: "core/group", id: "inside", styles: { width: "900px" } }));
		const { writes, getTree } = await run({ tool: "apply_phone_fixes", blocks: page, focusBlockId: "hero" });
		expect(writes[0].summary.updated).toEqual(["inside"]);
		expect(findBlockById({ blocks: getTree(), id: "inside" })?.styles).toMatchObject({ width: "100%" });
		expect(findBlockById({ blocks: getTree(), id: "outside" })?.styles).toMatchObject({ width: "900px" });
	});
});

describe("site tools", () => {
	const site = {
		listMedia: async ({ search, limit }: { search?: string; limit?: number }) => {
			const all = [
				{ id: "m1", url: "/media/door.jpg", name: "door.jpg", alt: "A red door", mimeType: "image/jpeg", width: 1200, height: 800 },
				{ id: "m2", url: "/media/logo.svg" },
			];
			return all.filter((file) => !search || file.url.includes(search)).slice(0, limit);
		},
		listPages: async () => [{ id: "p1", title: "About us", slug: "about", status: "published" }],
		listTemplateParts: async () => [{ id: "t1", name: "Main header", rootBlock: "core/header" }],
		getTheme: async () => ({ name: "Plain", colors: { accent: "#2563eb" }, fonts: { heading: "Inter" }, radius: "8px" }),
	};

	it("list_media passes the search and limit and lists urls", async () => {
		const { result } = await run({ tool: "list_media", input: { search: "door", limit: 5 }, blocks: [], site });
		expect(result.text).toBe('1 file:\n- url=/media/door.jpg name="door.jpg" alt="A red door" 1200x800 image/jpeg id=m1');
		const none = await run({ tool: "list_media", input: { search: "zzz" }, blocks: [], site });
		expect(none.result.text).toContain("No media found. Use /placeholder.png");
		const tooMany = await run({ tool: "list_media", input: { limit: 500 }, blocks: [], site });
		expect(tooMany.result.ok).toBe(false);
	});

	it("list_pages, list_template_parts and get_theme say what they found", async () => {
		expect((await run({ tool: "list_pages", blocks: [], site })).result.text).toBe('- "About us" link=/about status=published id=p1');
		expect((await run({ tool: "list_template_parts", blocks: [], site })).result.text).toBe('- "Main header" root=core/header id=t1');
		expect((await run({ tool: "get_theme", blocks: [], site })).result.text).toBe(
			"Theme: Plain\nColours:\n- accent: #2563eb\nHeading font: Inter\nCorner radius: 8px",
		);
	});

	it("list_pages gives a nested page its full address", async () => {
		const nested = { listPages: async () => [{ id: "p2", title: "Install", slug: "install", path: "guides/install", status: "published" }] };
		expect((await run({ tool: "list_pages", blocks: [], site: nested })).result.text).toBe('- "Install" link=/guides/install status=published id=p2');
	});

	it("turns a throwing lookup into a failed result", async () => {
		const { result, errors } = await run({
			tool: "list_pages",
			blocks: [],
			site: {
				listPages: async () => {
					throw new Error("site is down");
				},
			},
		});
		expect(result.ok).toBe(false);
		expect(result.text).toContain("site is down");
		expect(errors).toEqual([{ tool: "list_pages", message: "site is down" }]);
	});
});

describe("selected block rules", () => {
	const page = makeSamplePage();

	it("treats the focus block and everything under it as inside, and everything is inside without a focus", () => {
		const inside = (id: string) => isInsideFocus({ blocks: page, focusBlockId: "hero", id });
		expect([inside("hero"), inside("title"), inside("outro"), inside("shell")]).toEqual([true, true, false, false]);
		expect(isInsideFocus({ blocks: page, focusBlockId: null, id: "outro" })).toBe(true);
		expect(isInsideFocus({ blocks: page, focusBlockId: "ghost", id: "outro" })).toBe(false);
	});

	it("allows or refuses each kind of op against the selection", () => {
		const refusal = (op: Parameters<typeof explainFocusRefusal>[0]["op"]) => explainFocusRefusal({ blocks: page, focusBlockId: "hero", op });
		const para = makeParagraph({ id: "n", text: "x" });
		expect(refusal({ op: "insert", parentId: "hero", block: para })).toBeNull();
		expect(refusal({ op: "insert", parentId: null, block: para })).toContain("The page root is outside the selected block");
		expect(refusal({ op: "update", id: "title", set: {} })).toBeNull();
		expect(refusal({ op: "update", id: "outro", set: {} })).toContain("Block outro is outside");
		expect(refusal({ op: "delete", id: "intro" })).toBeNull();
		expect(refusal({ op: "delete", id: "hero" })).toContain("can't be deleted");
		expect(refusal({ op: "replace", id: "hero", block: para })).toBeNull();
		expect(refusal({ op: "move", id: "intro", parentId: "hero" })).toBeNull();
		expect(refusal({ op: "move", id: "intro", parentId: "shell" })).toContain("Block shell is outside");
		expect(explainFocusRefusal({ blocks: page, focusBlockId: null, op: { op: "delete", id: "shell" } })).toBeNull();
	});
});
