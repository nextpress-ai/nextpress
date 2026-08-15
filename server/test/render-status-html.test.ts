import { describe, expect, it } from "vitest";
import { renderStatusHtml } from "../../renderer/templates/status-page";

describe("renderStatusHtml", () => {
	it("uses the published page shell, not the stub theme", () => {
		const html = renderStatusHtml({
			status: 404,
			title: "Page not found",
			message: "This page is not available.",
			canonicalUrl: "http://localhost:5000/posts/missing",
		});

		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("Page not found");
		expect(html).toContain("This page is not available.");
		expect(html).toContain("noindex");
		expect(html).not.toContain("Custom rendered content");
		expect(html).not.toContain("A modern WordPress alternative");
		expect(html).not.toContain("hydrate.js");
	});

	it("renders a 500 page without claiming the document is missing", () => {
		const html = renderStatusHtml({
			status: 500,
			title: "Something went wrong",
			message: "The page could not be loaded.",
			canonicalUrl: "http://localhost:5000/home",
		});

		expect(html).toContain("500");
		expect(html).toContain("Something went wrong");
		expect(html).not.toContain("Page not found");
	});
});
