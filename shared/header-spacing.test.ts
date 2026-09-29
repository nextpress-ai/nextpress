import { describe, expect, it } from "vitest";
import { headerSpacingDecls, readHeaderSpacing } from "./header-spacing";
import { buildHeaderLookCss, readHeaderContent } from "./header-model";

describe("header spacing", () => {
	it("keeps safe lengths and drops anything that could break out of CSS", () => {
		expect(
			readHeaderSpacing({ paddingBlock: "1rem", paddingInline: "0", contentWidth: "1200px;background:red" }),
		).toEqual({ paddingBlock: "1rem", paddingInline: "0" });
		expect(readHeaderSpacing({ paddingBlock: null })).toEqual({});
	});

	it("turns settings into the variables the header rules read; full width adds nothing", () => {
		expect(headerSpacingDecls({ paddingBlock: "1rem", paddingInline: "2rem", contentWidth: "1240px" })).toBe(
			"--np-header-pad-block:1rem;--np-header-pad-inline:2rem;--np-header-max-width:1240px",
		);
		expect(headerSpacingDecls({ contentWidth: "100%" })).toBe("");
	});

	it("reaches the header's own CSS on canvas and published pages", () => {
		const content = readHeaderContent({
			kind: "structured",
			data: { contentWidth: "1240px", paddingBlock: "1.25rem", backgroundColor: { style: "#ffffff" } },
		});
		const css = buildHeaderLookCss({ blockId: "h1", content });
		expect(css).toContain(".block-h1 .wp-block-header{");
		expect(css).toContain("--np-header-max-width:1240px");
		expect(css).toContain("--np-header-pad-block:1.25rem");
	});

	it("adds no rule for a header with no look and no spacing", () => {
		expect(buildHeaderLookCss({ blockId: "h2", content: readHeaderContent({ kind: "structured", data: {} }) })).toBe("");
	});
});
