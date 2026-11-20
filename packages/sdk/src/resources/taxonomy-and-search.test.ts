import { describe, expect, it } from "vitest";
import { createTestClient, readCall, TEST_SITE_ID } from "../test/create-test-client.js";

const term = { name: "News", count: 3 };

describe("public.search", () => {
	it("asks the site's search API without a key and returns what the server sent", async () => {
		const answer = { query: "install", results: [{ path: "/install", pageTitle: "Install", heading: "", excerpt: "Run it.", score: 4 }] };
		const { client, calls } = createTestClient([
			{ method: "GET", path: "/api/public/search", handler: () => Response.json(answer) },
		]);

		const result = await client.public.search({ query: "  install  ", limit: 5 });

		expect(result).toEqual(answer);
		expect(readCall(calls[0])).toEqual({ pathname: "/api/public/search", query: { siteId: TEST_SITE_ID, q: "install", limit: "5" } });
	});

	it("answers an empty query without asking the server", async () => {
		const { client, calls } = createTestClient([]);

		expect(await client.public.search({ query: "   " })).toEqual({ query: "", results: [] });
		expect(calls).toHaveLength(0);
	});
});

describe("taxonomy", () => {
	it("lists categories and tags from the site's posts", async () => {
		const { client, calls } = createTestClient([
			{ method: "GET", path: "/api/categories", handler: () => Response.json([term]) },
			{ method: "GET", path: "/api/tags", handler: () => Response.json([{ name: "release", count: 1 }]) },
		]);

		expect(await client.taxonomy.categories()).toEqual([term]);
		expect(await client.taxonomy.tags()).toEqual([{ name: "release", count: 1 }]);
		expect(readCall(calls[0]).pathname).toBe("/api/categories");
		expect(readCall(calls[0]).query).toEqual({ siteId: TEST_SITE_ID });
		expect(readCall(calls[1]).pathname).toBe("/api/tags");
	});
});
