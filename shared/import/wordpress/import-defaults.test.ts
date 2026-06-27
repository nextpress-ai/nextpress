import { describe, it, expect } from "vitest";
import {
	applyImportBlockDefaults,
	buildImportedPageOther,
	DEFAULT_IMPORTED_PAGE_DESIGN,
} from "./import-defaults";
import type { BlockConfig } from "../../schema-types";

describe("applyImportBlockDefaults", () => {
	it("adds baseline padding and token units like getDefaultBlock", () => {
		const block: BlockConfig = {
			id: "b1",
			name: "core/paragraph",
			label: "Paragraph",
			type: "block",
			parentId: null,
			category: "basic",
			content: { kind: "text", value: "Hello" },
			styles: {},
			other: {},
		};

		const result = applyImportBlockDefaults(block);

		expect(result.styles?.padding).toBe("20px");
		expect(result.styles?.margin).toBe("0px");
		expect(result.other?.units).toMatchObject({ spacing: "px" });
		expect(result.other?.tokenMap).toEqual({});
	});

	it("preserves WP-imported styles over defaults", () => {
		const block: BlockConfig = {
			id: "b1",
			name: "core/paragraph",
			label: "Paragraph",
			type: "block",
			parentId: null,
			category: "basic",
			content: { kind: "text", value: "Hello" },
			styles: { padding: "40px", textAlign: "center" },
			other: { attributes: { className: "alignwide" } },
		};

		const result = applyImportBlockDefaults(block);

		expect(result.styles?.padding).toBe("40px");
		expect(result.styles?.textAlign).toBe("center");
	});

	it("applies layout block margins from the registry", () => {
		const block: BlockConfig = {
			id: "b1",
			name: "core/gallery",
			label: "Gallery",
			type: "block",
			parentId: null,
			category: "media",
			content: { kind: "structured", data: {} },
			styles: {},
		};

		const result = applyImportBlockDefaults(block);

		expect(result.styles?.margin).toBe("1em 0");
		expect(result.styles?.width).toBe("100%");
	});

	it("recurses into column children", () => {
		const child: BlockConfig = {
			id: "child",
			name: "core/paragraph",
			label: "Paragraph",
			type: "block",
			parentId: "cols",
			category: "basic",
			content: { kind: "text", value: "Hi" },
			styles: {},
		};

		const block: BlockConfig = {
			id: "cols",
			name: "core/columns",
			label: "Columns",
			type: "container",
			parentId: null,
			category: "layout",
			content: { kind: "structured", data: {} },
			styles: {},
			children: [child],
		};

		const result = applyImportBlockDefaults(block);

		expect(result.children?.[0]?.styles?.padding).toBe("20px");
	});
});

describe("buildImportedPageOther", () => {
	it("merges design, icons, and seo defaults with import metadata", () => {
		const other = buildImportedPageOther({
			baseOther: {
				import: { source: "wordpress", wpId: 5 },
			},
			title: "About Us",
			excerpt: "Our story",
		});

		expect(other.design).toEqual(DEFAULT_IMPORTED_PAGE_DESIGN);
		expect(other.icons?.defaultSet).toBe("lucide");
		expect(other.seo?.metaTitle).toBe("About Us");
		expect(other.seo?.metaDescription).toBe("Our story");
		expect(other.import?.wpId).toBe(5);
	});
});
