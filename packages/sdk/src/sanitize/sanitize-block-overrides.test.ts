import { describe, expect, it } from "vitest";
import { createBlocksBuilder } from "../blocks/build-block.js";
import { sanitizeBlockOverrides } from "./sanitize-block-overrides.js";

describe("sanitizeBlockOverrides", () => {
	it("sanitizes html and js escape hatches", () => {
		const out = sanitizeBlockOverrides({
			html: '<img onerror="alert(1)" src=x>',
			js: 'eval("bad")',
			css: ".x{}</style><script>alert(1)</script>",
		});
		expect(out.html).not.toContain("onerror");
		expect(out.js).not.toContain("eval(");
		expect(out.css).not.toContain("</style");
	});
});

describe("block builder overrides", () => {
	const blocks = createBlocksBuilder();

	it("applies sanitized html js css to block.other and customCss", () => {
		const block = blocks.paragraph({
			text: "Hello",
			html: '<div onclick="x">override</div>',
			js: 'eval("nope")',
			css: ".p{color:red}</style><script>",
		});
		expect(block.other?.html).not.toContain("onclick");
		expect(block.other?.js).not.toContain("eval(");
		expect(block.customCss).not.toContain("<script");
		expect(block.customCss).not.toContain("</style");
	});

	it("sanitizes core/html block content by default", () => {
		const block = blocks.html({
			value: '<p onclick="x">Hi</p><script>bad()</script>',
		});
		expect(block.content).toMatchObject({
			kind: "html",
			sanitized: true,
		});
		if (block.content?.kind === "html") {
			expect(block.content.value).not.toContain("<script");
			expect(block.content.value).not.toContain("onclick");
		}
	});
});
