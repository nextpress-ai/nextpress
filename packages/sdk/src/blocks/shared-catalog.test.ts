import { describe, expect, it } from "vitest";
import { blockConfigSchema } from "../schemas/index.js";
import type { BlockConfig } from "../types/domain.js";
import { BLOCK_DEFINITIONS, BLOCK_NAMES, isBlockName } from "./block-definitions.js";
import { createBlocksBuilder } from "./build-block.js";
import { BLOCK_CATALOG, createDefaultBlock, getBlockEntry } from "./shared-catalog.js";
import { validateBlockTree } from "./validate-block-tree.js";

const blocks = createBlocksBuilder();

/** Swaps every id for its place in the tree, so blocks made at different times can be compared. */
const withoutIds = ({
	block,
	path = "0",
	parentPath = null,
}: {
	block: BlockConfig;
	path?: string;
	parentPath?: string | null;
}): BlockConfig => ({
	...block,
	id: path,
	parentId: block.parentId === null ? null : parentPath,
	children: block.children?.map((child, index) =>
		withoutIds({ block: child, path: `${path}.${index}`, parentPath: path }),
	),
});

/** Every child must point at the block that holds it. */
const wrongParentIds = (block: BlockConfig): string[] =>
	(block.children ?? []).flatMap((child) => [
		...(child.parentId === block.id ? [] : [`${child.id} (${child.name})`]),
		...wrongParentIds(child),
	]);

const makeIds = () => {
	let count = 0;
	return () => `child-${++count}`;
};

describe("the SDK reads the shared block list", () => {
	it("names the same blocks as the shared catalog, in the same order", () => {
		expect(BLOCK_NAMES).toEqual(BLOCK_CATALOG.map((entry) => entry.name));
		expect(Object.keys(BLOCK_DEFINITIONS)).toEqual([...BLOCK_NAMES]);
		expect(blocks.names).toEqual(BLOCK_NAMES);
	});

	it("recognises every catalog name and rejects others", () => {
		expect(BLOCK_NAMES.every((name) => isBlockName(name))).toBe(true);
		expect(isBlockName("core/form")).toBe(true);
		expect(isBlockName("core/nope")).toBe(false);
	});

	it.each([
		...BLOCK_NAMES,
	])("defines %s with the catalog's label, kind, category and styles", (name) => {
		const entry = getBlockEntry(name);
		const def = BLOCK_DEFINITIONS[name];
		expect(def).toMatchObject({
			name: entry.name,
			label: entry.label,
			description: entry.description,
			type: entry.kind,
			category: entry.category,
		});
		expect(def.defaultStyles).toEqual(entry.defaultStyles);
		expect(def.defaultContent()).toEqual(entry.defaultContent());
		expect(entry.description.trim()).not.toBe("");
	});

	it("defines the docs blocks in the docs category, and says which core blocks the docs group also shows", () => {
		for (const name of ["docs/callout", "docs/code-group", "docs/file-tree", "docs/params", "docs/example"] as const) {
			expect(BLOCK_DEFINITIONS[name].category, name).toBe("docs");
		}
		expect(BLOCK_DEFINITIONS["core/code"]).toMatchObject({ category: "advanced", alsoIn: ["docs"] });
		expect(BLOCK_DEFINITIONS["core/heading"]).toMatchObject({ alsoIn: ["docs"] });
		expect(BLOCK_DEFINITIONS["core/button"]).not.toHaveProperty("alsoIn");
		expect(getBlockEntry("core/image").alsoIn).toEqual(["docs"]);
	});

	it("accepts a docs block in the page input check, where the category is named", () => {
		const callout = blocks.fromName("docs/callout");
		expect(callout.category).toBe("docs");
		expect(blockConfigSchema.safeParse(callout).success).toBe(true);
	});

	it("keeps every default style a string, as the SDK's public type says", () => {
		const notStrings = BLOCK_CATALOG.flatMap((entry) =>
			Object.entries(entry.defaultStyles)
				.filter(([, value]) => typeof value !== "string")
				.map(([key]) => `${entry.name}.${key}`),
		);
		expect(notStrings).toEqual([]);
	});

	it("gives a fresh default every time, so one block cannot change another", () => {
		const first = BLOCK_DEFINITIONS["core/buttons"].defaultContent();
		const second = BLOCK_DEFINITIONS["core/buttons"].defaultContent();
		expect(first).toEqual(second);
		expect(first).not.toBe(second);
	});
});

describe("fromName builds a block the way the editor inserts it", () => {
	it.each([...BLOCK_NAMES])("%s equals the editor's block, ignoring ids", (name) => {
		const fromSdk = blocks.fromName(name);
		const fromEditor = createDefaultBlock({ name, id: "editor-root", newId: makeIds() });

		expect(fromEditor).not.toBeNull();
		if (!fromEditor) return;
		expect(withoutIds({ block: fromSdk })).toEqual(withoutIds({ block: fromEditor }));
		expect(wrongParentIds(fromSdk)).toEqual([]);
		expect(fromSdk.id).toBeTruthy();
	});

	it.each([...BLOCK_NAMES])("%s passes the SDK's own tree check", (name) => {
		const result = validateBlockTree([blocks.fromName(name)]);
		expect(result.ok ? "ok" : result.issues.map((issue) => issue.message)).toBe("ok");
	});

	it("builds core/form, which the server accepts, and passes the tree check with its fields", () => {
		const form = blocks.fromName("core/form");
		expect(form.type).toBe("container");
		expect(form.children?.map((child) => child.name)).toEqual([
			"core/input",
			"core/input",
			"core/textarea",
			"core/button",
		]);
		expect(validateBlockTree([form])).toMatchObject({ ok: true, blockCount: 5 });
	});

	it("gives an accordion its three starting items, each with an answer", () => {
		const accordion = blocks.fromName("core/accordion");
		expect(accordion.children?.map((child) => child.name)).toEqual([
			"core/accordion-item",
			"core/accordion-item",
			"core/accordion-item",
		]);
		expect(accordion.children?.every((item) => item.children?.length === 1)).toBe(true);
		expect(wrongParentIds(accordion)).toEqual([]);
	});

	it("starting children carry no base spacing, like the editor's own", () => {
		const popup = blocks.fromName("core/popup");
		expect(popup.children?.length).toBeGreaterThan(0);
		expect(popup.children?.every((child) => child.styles?.padding === undefined)).toBe(true);
	});

	it("lets children passed by the caller win over the starting ones", () => {
		const own = blocks.paragraph({ text: "Mine" });
		const accordion = blocks.fromName("core/accordion", { children: [own] });
		expect(accordion.children).toHaveLength(1);
		expect(accordion.children?.[0]?.id).toBe(own.id);
		expect(accordion.children?.[0]?.parentId).toBe(accordion.id);
	});

	it("keeps an empty list of children the caller passed", () => {
		expect(blocks.fromName("core/accordion", { children: [] }).children).toEqual([]);
	});

	it("gives starting children when the block is built from nested settings too", () => {
		const accordion = blocks.fromName("core/accordion", {
			settings: { content: { look: "flat" } },
		});
		expect(accordion.content).toMatchObject({ kind: "structured", data: { look: "flat" } });
		expect(accordion.children).toHaveLength(3);
	});

	it("leaves containers without starting children empty, like the editor", () => {
		expect(blocks.fromName("core/group").children).toEqual([]);
		expect(blocks.fromName("core/heading").children).toBeUndefined();
	});
});
