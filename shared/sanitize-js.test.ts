import { describe, expect, it } from "vitest";
import { sanitizeJs } from "./sanitize-js.js";
import { sanitizeHtml } from "./sanitize-html.js";
import { sanitizeCustomCss } from "./sanitize-custom-css.js";
import { sanitizeBlockOverrides } from "./sanitize-block-overrides.js";

describe("sanitizeJs", () => {
	it("blocks eval and Function constructor", () => {
		const input = 'eval("alert(1)"); new Function("x", "return x")();';
		expect(sanitizeJs(input)).not.toContain("eval(");
		expect(sanitizeJs(input)).not.toContain("new Function");
	});

	it("strips script tags", () => {
		expect(sanitizeJs('<script>alert(1)</script>console.log("ok")')).not.toContain("<script");
	});

	it("blocks document.write and innerHTML assignment", () => {
		const input = 'document.write("x"); el.innerHTML = "<img>";';
		expect(sanitizeJs(input)).not.toContain("document.write");
		expect(sanitizeJs(input)).not.toContain("innerHTML =");
	});
});

describe("sanitizeHtml", () => {
	it("strips script tags and on* handlers", () => {
		const input = '<p onclick="alert(1)">Hi</p><script>bad()</script>';
		const out = sanitizeHtml(input);
		expect(out).not.toContain("<script");
		expect(out).not.toContain("onclick");
	});
});

describe("sanitizeCustomCss", () => {
	it("strips style/script breakouts", () => {
		expect(sanitizeCustomCss(".a{}</style><script>")).not.toContain("</style");
		expect(sanitizeCustomCss(".a{}</style><script>")).not.toContain("<script");
	});
});

describe("sanitizeBlockOverrides", () => {
	it("sanitizes html js and css together", () => {
		const out = sanitizeBlockOverrides({
			html: '<div onclick="x">ok</div>',
			js: 'eval("1")',
			css: ".x{}</style><script>",
		});
		expect(out.html).not.toContain("onclick");
		expect(out.js).not.toContain("eval(");
		expect(out.css).not.toContain("</style");
	});
});
