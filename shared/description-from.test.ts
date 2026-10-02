import { describe, expect, it } from "vitest";
import { resolvePublishedDescription } from "./description-from.js";

describe("resolvePublishedDescription", () => {
	it("uses the page description, then the excerpt, then the site", () => {
		expect(
			resolvePublishedDescription({
				metaDescription: "From the page",
				excerpt: "From the excerpt",
				siteDescription: "From the site",
			}),
		).toBe("From the page");
		expect(
			resolvePublishedDescription({
				excerpt: "From the excerpt",
				siteDescription: "From the site",
			}),
		).toBe("From the excerpt");
	});

	it("lets a page choose the excerpt even when it has its own description", () => {
		expect(
			resolvePublishedDescription({
				metaDescription: "From the page",
				excerpt: "From the excerpt",
				siteDescription: "From the site",
				pageFrom: "excerpt",
				siteFrom: "site",
			}),
		).toBe("From the excerpt");
	});

	it("follows the site choice when the page does not pick one", () => {
		expect(
			resolvePublishedDescription({
				metaDescription: "From the page",
				excerpt: "From the excerpt",
				siteDescription: "From the site",
				siteFrom: "site",
			}),
		).toBe("From the site");
	});
});
