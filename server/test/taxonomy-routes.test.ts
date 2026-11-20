import { AddressInfo } from "node:net";
import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Deps } from "../routes/shared/deps";
import { createTaxonomyRoutes } from "../routes/taxonomy.routes";

/**
 * The category and tag lists are derived from a site's published posts. These tests drive the real
 * route with a fake model layer, so they check what a request returns, not the shape of a helper.
 */

type FakePost = { id: string; blogId: string; status: string; other: unknown };

const fakeModels = ({ blogs, posts }: { blogs: { id: string; siteId: string }[]; posts: FakePost[] }): Deps["models"] =>
	({
		blogs: {
			findManyWhere: async (filters: { where: string; equals?: string }[]) =>
				blogs.filter((blog) => filters.every((filter) => (blog as Record<string, unknown>)[filter.where] === filter.equals)),
		},
		posts: {
			findManyWhere: async (filters: { where: string; equals?: string; in?: unknown[] }[], options?: { limit?: number; offset?: number }) => {
				const matching = posts.filter((post) =>
					filters.every((filter) => {
						const value = (post as Record<string, unknown>)[filter.where];
						if ("in" in filter && Array.isArray(filter.in)) return filter.in.includes(value);
						return value === filter.equals;
					}),
				);
				const offset = options?.offset ?? 0;
				const limit = options?.limit ?? 50;
				return matching.slice(offset, offset + limit);
			},
		},
		sites: {
			findByHostname: async () => ({ id: "site-1" }),
			findDefaultSite: async () => ({ id: "site-1" }),
			findById: async () => ({ id: "site-1" }),
		},
	} as unknown as Deps["models"]);

const servers: Array<ReturnType<typeof createServer>> = [];

const serve = async ({ models }: { models: Deps["models"] }) => {
	const app = express();
	const deps = { models, CONFIG: { STATUS: { PUBLISH: "publish" } } } as unknown as Deps;
	app.use("/api", createTaxonomyRoutes(deps));
	const server = createServer(app);
	servers.push(server);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
	const { port } = server.address() as AddressInfo;
	return (path: string) => fetch(`http://127.0.0.1:${port}${path}`);
};

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

const blogs = [
	{ id: "blog-1", siteId: "site-1" },
	{ id: "blog-2", siteId: "site-2" },
];
const posts: FakePost[] = [
	{ id: "p1", blogId: "blog-1", status: "publish", other: { categories: ["News", "Guides"], tags: ["release"] } },
	{ id: "p2", blogId: "blog-1", status: "publish", other: { categories: ["News"], tags: ["release"] } },
	{ id: "p3", blogId: "blog-1", status: "draft", other: { categories: ["Half written"], tags: ["half", "draft-only-tag"] } },
	{ id: "p4", blogId: "blog-2", status: "publish", other: { categories: ["Other site"], tags: ["elsewhere"] } },
];

describe("GET /api/categories and /api/tags", () => {
	it("counts the site's categories from its published posts only", async () => {
		const get = await serve({ models: fakeModels({ blogs, posts }) });
		const response = await get("/api/categories");
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([
			{ name: "News", count: 2 },
			{ name: "Guides", count: 1 },
		]);
	});

	it("counts tags the same way", async () => {
		const get = await serve({ models: fakeModels({ blogs, posts }) });
		expect(await (await get("/api/tags")).json()).toEqual([{ name: "release", count: 2 }]);
	});

	it("leaves out a draft's terms and another site's posts", async () => {
		const get = await serve({ models: fakeModels({ blogs, posts }) });
		const text = await (await get("/api/tags")).text();
		expect(text).not.toContain("half");
		expect(text).not.toContain("elsewhere");
		expect(text).not.toContain("Other site");
	});

	it("answers an empty list when the site has no blogs", async () => {
		const get = await serve({ models: fakeModels({ blogs: [], posts }) });
		expect(await (await get("/api/categories")).json()).toEqual([]);
	});

	it("says so in plain words and logs the cause when the posts cannot be read", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const models = fakeModels({ blogs, posts });
		(models.posts.findManyWhere as unknown) = async () => {
			throw new Error("the database went away");
		};
		const get = await serve({ models });
		const response = await get("/api/tags");
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: "Couldn't load the list right now. Try again in a moment." });
		expect(logged).toHaveBeenCalledWith(
			expect.objectContaining({
				atFunction: "taxonomy.list.tags",
				data: expect.objectContaining({ error: expect.objectContaining({ message: "the database went away" }) }),
			}),
		);
	});
});
