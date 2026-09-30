import { describe, expect, it } from "vitest";
import { findPageLinks, pageSlugFromPath, rewritePageLinks } from "./page-links";

const blocks = [
	{ name: "core/header", content: { data: { brand: { href: "/" }, actions: [{ href: "/contact" }] } } },
	{ name: "core/button", content: { url: "/Contact/#form", value: "Join" } },
	{ name: "core/paragraph", content: { value: '<a href="/terms-and-conditions/">Terms</a> and <a href="https://x.com/about">x</a>' } },
	{ name: "core/image", content: { url: "/uploads/hero.png" } },
	{ name: "core/button", content: { url: "#popup-get-updates" } },
	{ name: "core/button", content: { url: "/api/forms/submit" } },
];

describe("findPageLinks", () => {
	it("finds page addresses in link fields and in text, once each, homepage as /", () => {
		expect(findPageLinks(blocks).sort()).toEqual(["/", "contact", "terms-and-conditions"]);
	});

	it("reads addresses the way a browser would", () => {
		expect(pageSlugFromPath("/about-us/?ref=x#team")).toBe("about-us");
		expect(pageSlugFromPath("/my%20page")).toBe("my page");
		expect(pageSlugFromPath("//evil.com/x")).toBeNull();
		expect(pageSlugFromPath("/blog/post-1")).toBeNull();
		expect(pageSlugFromPath("/uploads/a.png")).toBeNull();
	});
});

describe("rewritePageLinks", () => {
	it("moves links to renamed pages, keeping any trailing part, and leaves the rest alone", () => {
		const next = rewritePageLinks({ value: blocks, slugMap: { contact: "contact-2" } });
		const text = JSON.stringify(next);
		expect(text).toContain('"href":"/contact-2"');
		expect(text).toContain('"url":"/contact-2/#form"');
		expect(text).toContain('"href":"/"');
		expect(text).toContain("/terms-and-conditions/");
		expect(text).toContain("#popup-get-updates");
	});

	it("rewrites links inside text too", () => {
		const next = rewritePageLinks({
			value: { value: '<a href="/terms-and-conditions/">Terms</a>' },
			slugMap: { "terms-and-conditions": "terms" },
		});
		expect(next.value).toBe('<a href="/terms/">Terms</a>');
	});
});
