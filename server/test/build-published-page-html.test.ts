import { describe, expect, it } from "vitest";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";
import { responsiveGoldenFixtures } from "@shared/test/fixtures/responsive/fixtures";

describe("buildPublishedPageHtml", () => {
	it("renders full HTML with publish CSS and block content, not theme stub", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "page-1",
				title: "Stress Test",
				slug: "stress-test",
				blocks: responsiveGoldenFixtures.content,
				other: {
					seo: {},
					design: { containerWidth: "1200px", padding: "2rem 1rem" },
				},
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/pages/page-1",
		});

		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("Heading level 1");
		expect(html).toContain(".wp-block-image img");
		expect(html).toContain("is-stacked-on-mobile");
		expect(html).not.toContain("Custom rendered content");
	});

	it("renders layout and typography golden fixtures without stub HTML", () => {
		for (const [name, blocks] of Object.entries(responsiveGoldenFixtures)) {
			if (name === "legacy") continue;
			const html = buildPublishedPageHtml({
				page: {
					id: `page-${name}`,
					title: `${name} stress`,
					slug: `${name}-stress`,
					blocks,
					other: { seo: {}, design: {} },
				} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
				canonicalUrl: `http://localhost:5000/pages/page-${name}`,
			});
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).not.toContain("Custom rendered content");
		}
	});
});
