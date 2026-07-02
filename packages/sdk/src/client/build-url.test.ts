import { describe, expect, it } from "vitest";
import { buildUrl, normalizeBaseUrl, withSiteId } from "./build-url.js";

describe("build-url", () => {
	it("normalizes trailing slashes", () => {
		expect(normalizeBaseUrl("https://example.com/")).toBe("https://example.com");
	});

	it("builds path and query", () => {
		const url = buildUrl({
			baseUrl: "https://example.com",
			path: "/api/posts",
			query: { page: 1, status: "publish" },
		});
		expect(url).toBe("https://example.com/api/posts?page=1&status=publish");
	});

	it("omits null and undefined query values", () => {
		const url = buildUrl({
			baseUrl: "https://example.com",
			path: "/api/posts",
			query: { page: 1, blog_id: undefined, siteId: null },
		});
		expect(url).toBe("https://example.com/api/posts?page=1");
	});

	it("merges default siteId", () => {
		const query = withSiteId({
			query: { page: 1 },
			siteId: "00000000-0000-4000-8000-000000000001",
		});
		expect(query?.siteId).toBe("00000000-0000-4000-8000-000000000001");
	});

	it("does not override explicit siteId", () => {
		const query = withSiteId({
			query: { siteId: "explicit-id" },
			siteId: "default-id",
		});
		expect(query?.siteId).toBe("explicit-id");
	});
});
