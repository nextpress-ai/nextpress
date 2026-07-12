import { describe, it, expect } from "vitest";
import { buildGalleryRenderModel } from "@shared/gallery-render";
import { collectUsedBundledFontFamilies } from "@shared/collect-font-families";
import type { BlockConfig } from "@shared/schema-types";

describe("buildGalleryRenderModel", () => {
	it("defaults to 3-column grid with display grid", () => {
		const model = buildGalleryRenderModel({
			content: {
				kind: "structured",
				data: {
					images: [
						{ id: "1", url: "https://example.com/a.jpg", alt: "A" },
						{ id: "2", url: "https://example.com/b.jpg", alt: "B" },
					],
				},
			},
		});

		expect(model.columns).toBe(3);
		expect(model.gridStyle.display).toBe("grid");
		expect(model.gridStyle.gridTemplateColumns).toBe("repeat(3, 1fr)");
	});
});

describe("collectUsedBundledFontFamilies", () => {
	it("includes page design and nested block fontFamily from catalog", () => {
		const blocks: BlockConfig[] = [
			{
				id: "h1",
				name: "core/heading",
				label: "Heading",
				type: "block",
				parentId: null,
				content: { kind: "text", value: "Hi" },
				styles: { fontFamily: "Inter, sans-serif" },
			},
		];

		const families = collectUsedBundledFontFamilies({
			blocks,
			pageDesign: { fontFamily: "Roboto, sans-serif" },
		});

		expect(families).toContain("Inter, sans-serif");
		expect(families).toContain("Roboto, sans-serif");
	});
});
