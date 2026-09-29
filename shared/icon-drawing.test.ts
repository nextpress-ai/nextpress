import { describe, expect, it } from "vitest";
import {
	isLocalIconFileUrl,
	isSvglFileUrl,
	sanitizeSvgMarkup,
	slugifyIconName,
} from "./icon-drawing.js";
import { validateIconReference } from "./validate-icon-reference.js";

const clean = (svg: string): string => {
	const result = sanitizeSvgMarkup(svg);
	if (!result.ok) throw new Error(result.message);
	return result.svg;
};

describe("sanitizeSvgMarkup", () => {
	it("keeps an ordinary drawing as it is", () => {
		const svg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 1h22v22H1z"/></svg>';
		expect(clean(svg)).toBe(svg);
	});

	it("removes scripts, embedded HTML and event handlers", () => {
		const svg = [
			'<svg onload="steal()" viewBox="0 0 1 1">',
			"<script>steal()</script>",
			"<foreignObject><iframe src=\"https://evil.test\"></iframe></foreignObject>",
			"<circle onclick='go()' onmouseover=go() r=\"1\"/>",
			"</svg>",
		].join("");
		const out = clean(svg);
		expect(out).not.toMatch(/script|foreignObject|iframe|onload|onclick|onmouseover/i);
		expect(out).toContain('<circle r="1"/>');
	});

	it("drops outside links and javascript: but keeps in-file references", () => {
		const out = clean(
			'<svg><a href="javascript:alert(1)"><use xlink:href="#shape"/></a><image href="https://evil.test/x.png"/></svg>',
		);
		expect(out).not.toMatch(/javascript:|evil\.test/);
		expect(out).toContain('xlink:href="#shape"');
	});

	it("strips the xml line and comments that logo files often carry", () => {
		expect(clean('<?xml version="1.0"?>\n<!-- logo --><svg viewBox="0 0 1 1"></svg>')).toBe(
			'<svg viewBox="0 0 1 1"></svg>',
		);
	});

	it("refuses DOCTYPE and ENTITY tricks and anything that is not one svg", () => {
		expect(sanitizeSvgMarkup('<!DOCTYPE svg [<!ENTITY x "y">]><svg></svg>').ok).toBe(false);
		expect(sanitizeSvgMarkup("<div><svg></svg></div>").ok).toBe(false);
		expect(sanitizeSvgMarkup("not a drawing").ok).toBe(false);
	});
});

describe("icon file addresses", () => {
	it("accepts pictures in this site's uploads only", () => {
		expect(isLocalIconFileUrl("/uploads/svgl-123-456.svg")).toBe(true);
		expect(isLocalIconFileUrl("/uploads/my-icon.PNG")).toBe(true);
		expect(isLocalIconFileUrl("https://cdn.test/icon.svg")).toBe(false);
		expect(isLocalIconFileUrl("/uploads/../secrets.svg")).toBe(false);
		expect(isLocalIconFileUrl("/uploads/photo.jpg")).toBe(false);
	});

	it("lets the server fetch svgl.app logo files and nothing else", () => {
		expect(isSvglFileUrl("https://svgl.app/library/cursor_light.svg")).toBe(true);
		expect(isSvglFileUrl("https://svgl.app/library/cursor_light.svg?x=1")).toBe(false);
		expect(isSvglFileUrl("https://evil.test/library/cursor.svg")).toBe(false);
		expect(isSvglFileUrl("http://svgl.app/library/cursor.svg")).toBe(false);
		expect(isSvglFileUrl("https://svgl.app/api/other")).toBe(false);
	});

	it("makes a stable name from a logo title", () => {
		expect(slugifyIconName("GitHub Copilot")).toBe("github-copilot");
		expect(slugifyIconName("Next.js")).toBe("next-js");
	});
});

describe("validateIconReference with drawings and pictures", () => {
	it("accepts a brand logo that points at its saved copy", () => {
		const result = validateIconReference({
			iconSet: "svgl",
			iconName: "cursor",
			url: "/uploads/svgl-1-2.svg",
			label: "Cursor",
		});
		expect(result.ok).toBe(true);
	});

	it("still accepts a brand logo saved before logos were files (it paints a placeholder)", () => {
		expect(validateIconReference({ iconSet: "svgl", iconName: "github" }).ok).toBe(true);
	});

	it("refuses a brand logo or upload pointing off-site", () => {
		expect(validateIconReference({ iconSet: "svgl", iconName: "x", url: "https://evil.test/x.svg" }).ok).toBe(false);
		expect(validateIconReference({ iconSet: "custom", iconName: "x", url: "https://evil.test/x.png" }).ok).toBe(false);
	});

	it("needs a picture for an uploaded icon", () => {
		expect(validateIconReference({ iconSet: "custom", iconName: "mine.svg" }).ok).toBe(false);
		expect(
			validateIconReference({ iconSet: "custom", iconName: "mine.png", url: "/uploads/mine.png", tint: true }).ok,
		).toBe(true);
	});

	it("accepts a clean react-icons drawing and refuses one with a script", () => {
		const svg = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M0 0h24v24H0z"/></svg>';
		expect(validateIconReference({ iconSet: "react-icons", iconName: "lu:LuSearch", svg }).ok).toBe(true);
		expect(
			validateIconReference({
				iconSet: "react-icons",
				iconName: "lu:LuSearch",
				svg: '<svg onload="x()"></svg>',
			}).ok,
		).toBe(false);
	});
});
