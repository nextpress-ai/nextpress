import { AddressInfo } from "node:net";
import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import type { Deps } from "../routes/shared/deps";
import { createPublicRoutes } from "../routes/public.routes";
import { SITE_PAGE_LIMIT } from "../lib/page-paths/page-paths";

/**
 * The public search API answers from the same prebuilt index the browser downloads: the real route,
 * a fake model layer, and the site resolved from the address, as on a live install.
 */

const SITE = { id: "660e8400-e29b-41d4-a716-446655440000", name: "Docs", siteUrl: "http://localhost:5000" };

const heading = (id: string, value: string, level = 2): BlockConfig =>
	({ id, name: "core/heading", type: "block", parentId: null, content: { kind: "text", value, level } }) as BlockConfig;
const paragraph = (id: string, value: string): BlockConfig =>
	({ id, name: "core/paragraph", type: "block", parentId: null, content: { kind: "text", value } }) as BlockConfig;

type FakePage = { id: string; title: string; slug: string; status: string; password: string | null; blocks: BlockConfig[]; version: number; updatedAt: Date; siteId: string; parentId: string | null };

const page = (overrides: Partial<FakePage> & { slug: string }): FakePage => ({
	id: `id-${overrides.slug}`,
	title: overrides.slug,
	status: "publish",
	password: null,
	blocks: [],
	version: 1,
	updatedAt: new Date("2026-10-01T00:00:00Z"),
	siteId: SITE.id,
	parentId: null,
	...overrides,
});

const installPage = page({
	slug: "install",
	title: "Install NextPress",
	blocks: [heading("a", "Install NextPress", 1), paragraph("b", "Download the release and run it with pnpm."), heading("c", "Backups"), paragraph("d", "Copy the uploads folder before you update.")],
});
const aboutPage = page({ slug: "about", title: "About us", blocks: [paragraph("e", "We make websites simple.")] });
const hidden = [
	page({ slug: "secret-plans", title: "Secret plans", status: "draft", blocks: [paragraph("f", "zebra launch")] }),
	page({ slug: "private-notes", title: "Private notes", status: "private", blocks: [paragraph("g", "zebra private")] }),
	page({ slug: "locked", title: "Locked", password: "pw", blocks: [paragraph("h", "zebra vault")] }),
	page({ slug: "old-news", title: "Old news", status: "trash", blocks: [paragraph("i", "zebra trash")] }),
];

const fakeModels = ({ pages, noSite = false }: { pages: () => FakePage[]; noSite?: boolean }): Deps["models"] => {
	const site = noSite ? undefined : SITE;
	const matches = (filters: { where: string; equals?: string }[]): FakePage[] =>
		pages().filter((row) => filters.every((filter) => (row as Record<string, unknown>)[filter.where] === filter.equals));
	return {
		sites: {
			findById: async () => site,
			findByHostname: async () => site,
			findDefaultSite: async () => site,
			getSettings: async () => ({ general: { siteName: "Docs", siteDescription: "Guides", siteUrl: SITE.siteUrl }, reading: {} }),
		},
		pages: {
			count: async ({ where }: { where: { where: string; equals?: string }[] }) => matches(where).length,
			findManyWhere: async (filters: { where: string; equals?: string }[], options?: { limit?: number }) => {
				const rows = matches(filters).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
				return options?.limit === SITE_PAGE_LIMIT ? rows : rows.slice(0, options?.limit);
			},
		},
		options: { getOption: async () => undefined },
	} as unknown as Deps["models"];
};

const servers: Array<ReturnType<typeof createServer>> = [];

const serve = async ({ models }: { models: Deps["models"] }) => {
	const app = express();
	const deps = { models } as Deps;
	app.use("/api/public", createPublicRoutes(deps));
	const server = createServer(app);
	servers.push(server);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
	const { port } = server.address() as AddressInfo;
	return (path: string, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${port}${path}`, { headers });
};

afterEach(async () => {
	vi.restoreAllMocks();
	await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

type SearchBody = { query: string; results: { path: string; pageTitle: string; heading: string; excerpt: string; score: number }[] };

describe("GET /api/public/search", () => {
	const rows = () => [installPage, aboutPage, ...hidden];

	it("answers a query with where to open each result and the words to show", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const response = await get("/api/public/search?q=backups");
		expect(response.status).toBe(200);
		expect(response.headers.get("cache-control")).toBe("no-store");

		const body = (await response.json()) as SearchBody;
		expect(body.query).toBe("backups");
		expect(body.results[0]).toMatchObject({
			pageTitle: "Install NextPress",
			heading: "Backups",
			path: "/install#backups",
			excerpt: "Copy the uploads folder before you update.",
		});
		expect(typeof body.results[0]?.score).toBe("number");
	});

	it("never carries text from a draft, private, passworded or removed page", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const text = await (await get("/api/public/search?q=zebra")).text();
		expect((JSON.parse(text) as SearchBody).results).toEqual([]);
		for (const leak of ["Secret plans", "Private notes", "Locked", "Old news", "secret-plans", "private-notes"]) {
			expect(text).not.toContain(leak);
		}
	});

	it("finds a nested page at its full address", async () => {
		const guides = page({ slug: "guides", title: "Guides", status: "draft", blocks: [paragraph("n1", "Start here.")] });
		const nested = page({ slug: "backup", title: "Back up your site", parentId: guides.id, blocks: [paragraph("n3", "Copy the narwhal folder.")] });
		const get = await serve({ models: fakeModels({ pages: () => [guides, nested, aboutPage] }) });
		const body = (await (await get("/api/public/search?q=narwhal")).json()) as SearchBody;
		expect(body.results[0]?.path).toBe("/guides/backup");
	});

	it("answers an empty query with no results instead of an error", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const body = (await (await get("/api/public/search?q=%20%20")).json()) as SearchBody;
		expect(body.results).toEqual([]);
	});

	it("keeps the count asked for inside its own limits", async () => {
		const pages = Array.from({ length: 30 }, (_, index) =>
			page({ slug: `guide-${index}`, title: `Guide ${index}`, blocks: [paragraph(`p-${index}`, `Quokka number ${index}.`)] }),
		);
		const get = await serve({ models: fakeModels({ pages: () => pages }) });
		expect(((await (await get("/api/public/search?q=quokka&limit=3")).json()) as SearchBody).results).toHaveLength(3);
		expect(((await (await get("/api/public/search?q=quokka&limit=999")).json()) as SearchBody).results.length).toBeLessThanOrEqual(50);
	});

	it("answers 404 when the address belongs to no site", async () => {
		const get = await serve({ models: fakeModels({ pages: rows, noSite: true }) });
		const response = await get("/api/public/search?q=install");
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: "Site not found" });
	});

	it("says so in plain words and logs the cause when the search cannot run", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const models = fakeModels({ pages: rows });
		// The index build reads the pages; make that read fail, the way a lost database would.
		(models.pages.findManyWhere as unknown) = async () => {
			throw new Error("the database went away");
		};
		const get = await serve({ models });
		const response = await get("/api/public/search?q=install");
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: "Search isn't available right now. Try again in a moment." });
		expect(logged).toHaveBeenCalledWith(
			expect.objectContaining({
				atFunction: "public.search",
				data: expect.objectContaining({ error: expect.objectContaining({ message: "the database went away" }) }),
			}),
		);
	});
});
