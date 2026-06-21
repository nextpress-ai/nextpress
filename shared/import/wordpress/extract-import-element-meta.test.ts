import { describe, it, expect } from "vitest";
import { parse } from "node-html-parser";
import {
	parseImportClassTokens,
	parseImportInlineStyle,
	extractImportElementMeta,
	mergeImportElementMeta,
} from "./extract-import-element-meta";

describe("parseImportClassTokens", () => {
	it("maps Gutenberg alignment and drop-cap classes to typed fields", () => {
		expect(
			parseImportClassTokens(
				"wp-block-paragraph has-text-align-center has-drop-cap is-style-rounded",
			),
		).toEqual({
			textAlign: "center",
			dropCap: true,
			className: "is-style-rounded",
		});
	});

	it("maps alignwide and size classes for images", () => {
		expect(parseImportClassTokens("wp-block-image alignwide size-large")).toEqual({
			align: "wide",
			sizeSlug: "large",
		});
	});
});

describe("parseImportInlineStyle", () => {
	it("parses safe inline styles to camelCase CSSProperties", () => {
		expect(parseImportInlineStyle("margin-top: 2em; color: #333;")).toEqual({
			marginTop: "2em",
			color: "#333",
		});
	});

	it("drops unsafe values", () => {
		expect(parseImportInlineStyle("color: expression(alert(1))")).toEqual({});
	});
});

describe("extractImportElementMeta", () => {
	it("extracts anchor, class tokens, styles, and passthrough attrs", () => {
		const el = parse(
			'<h2 id="intro" class="has-text-align-right is-style-underline" style="margin-bottom:1em" data-wp-block="x" aria-label="Intro">Hi</h2>',
		).querySelector("h2")!;

		const meta = extractImportElementMeta({ el });
		expect(meta.contentPatch).toMatchObject({
			anchor: "intro",
			textAlign: "right",
			className: "is-style-underline",
		});
		expect(meta.styles).toEqual({ marginBottom: "1em" });
		expect(meta.attributes).toEqual({
			"data-wp-block": "x",
			"aria-label": "Intro",
		});
	});

	it("maps img width/height attributes to styles", () => {
		const el = parse('<img width="640" height="480" title="Hero">').querySelector("img")!;
		const meta = extractImportElementMeta({ el });
		expect(meta.styles).toEqual({ width: "640px", height: "480px" });
		expect(meta.contentPatch.title).toBe("Hero");
	});
});

describe("mergeImportElementMeta", () => {
	it("merges figure wrapper align with img size classes", () => {
		const figure = parse('<figure class="alignwide wp-block-image"></figure>').querySelector(
			"figure",
		)!;
		const img = parse('<img class="size-large is-style-rounded" width="300">').querySelector(
			"img",
		)!;

		const merged = mergeImportElementMeta(
			extractImportElementMeta({ el: img }),
			extractImportElementMeta({ el: figure }),
		);

		expect(merged.contentPatch.align).toBe("wide");
		expect(merged.contentPatch.sizeSlug).toBe("large");
		expect(merged.contentPatch.className).toBe("is-style-rounded");
		expect(merged.styles.width).toBe("300px");
	});
});
