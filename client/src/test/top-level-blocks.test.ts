import { describe, expect, it } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import { listTopLevelBlocks, topLevelBlockOptions, topLevelSelectionId } from "@/components/PageBuilder/top-level-blocks";

const block = (id: string, name: string, children?: BlockConfig[], value?: string): BlockConfig => ({
	id,
	name,
	type: children ? "container" : "block",
	parentId: null,
	content: value ? { kind: "text", value } : { kind: "empty" },
	children,
});

describe("top level blocks", () => {
	const image = block("img", "core/image");
	const stack = block("stack", "core/stack", [image]);
	const heading = block("h1", "core/heading", undefined, "Walkable");
	const other = block("h2", "core/heading", undefined, "Streets");
	const shell = block("shell", "core/page-shell", [heading, stack, other]);

	it("lists the page shell and its direct children, not blocks nested inside them", () => {
		expect(listTopLevelBlocks([shell]).map((item) => item.id)).toEqual(["shell", "h1", "stack", "h2"]);
	});

	it("lists root blocks when the page has no shell", () => {
		expect(listTopLevelBlocks([heading, stack]).map((item) => item.id)).toEqual(["h1", "stack"]);
	});

	it("keeps a nested selection pointed at the top-level block that holds it", () => {
		expect(topLevelSelectionId([shell], "img")).toBe("stack");
		expect(topLevelSelectionId([shell], "shell")).toBe("shell");
		expect(topLevelSelectionId([shell], null)).toBeUndefined();
	});

	it("uses a short bit of text when two blocks share a name", () => {
		const options = topLevelBlockOptions([shell], { "core/heading": "Heading", "core/page-shell": "Page shell", "core/stack": "Stack" });
		expect(options.map((option) => option.label)).toEqual([
			"Page shell",
			"Heading — Walkable",
			"Stack",
			"Heading — Streets",
		]);
	});
});
