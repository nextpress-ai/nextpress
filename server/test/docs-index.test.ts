import { AddressInfo } from "node:net";
import { createServer } from "node:http";
import express from "express";
import MiniSearch from "minisearch";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BlockConfig } from "@shared/schema-types";
import type { Deps } from "../routes/shared/deps";
import { createPublicRoutes } from "../routes/public.routes";
import { createRenderRoutes } from "../routes/render.routes";
import { SITE_PAGE_LIMIT } from "../lib/page-paths/page-paths";
import { SEARCH_INDEX_OPTIONS, scheduleSearchIndexRebuild, type SearchIndexPayload } from "../lib/site-search";

const SITE = { id: "550e8400-e29b-41d4-a716-446655440000", name: "Docs", siteUrl: "http://localhost:5000" };
const CACHE_CONTROL = "public, max-age=60, must-revalidate";

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
const unreadable = [
	page({ slug: "secret-plans", title: "Secret plans", status: "draft", blocks: [paragraph("f", "zebra launch")] }),
	page({ slug: "private-notes", title: "Private notes", status: "private", blocks: [paragraph("g", "zebra private")] }),
	page({ slug: "locked", title: "Locked", password: "pw", blocks: [paragraph("h", "zebra vault")] }),
	page({ slug: "old-news", title: "Old news", status: "trash", blocks: [paragraph("i", "zebra trash")] }),
];

type Counters = { builds: number };

const fakeModels = ({ pages, counters, failBuild = false, noSite = false }: { pages: () => FakePage[]; counters?: Counters; failBuild?: boolean; noSite?: boolean }): Deps["models"] => {
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
				if (options?.limit !== SITE_PAGE_LIMIT) return rows.slice(0, options?.limit);
				if (counters) counters.builds += 1;
				if (failBuild) throw new Error("the database went away");
				return rows;
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
	app.use("/", createRenderRoutes(deps));
	const server = createServer(app);
	servers.push(server);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
	const { port } = server.address() as AddressInfo;
	return (path: string, headers: Record<string, string> = {}) => fetch(`http://127.0.0.1:${port}${path}`, { headers });
};

afterEach(async () => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

const INDEX = "/api/public/docs-index";
const readIndex = async (response: Response) => (await response.json()) as SearchIndexPayload;
const openIndex = (payload: SearchIndexPayload) => MiniSearch.loadJS(payload.index, payload.options);

describe("GET /api/public/docs-index", () => {
	const rows = () => [installPage, aboutPage, ...unreadable];

	it("answers with the index, the settings to read it with and when it was made", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const response = await get(INDEX);
		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toContain("application/json");
		expect(response.headers.get("cache-control")).toBe(CACHE_CONTROL);
		expect(response.headers.get("etag")).toMatch(/^W\/"[\w-]+"$/);

		const payload = await readIndex(response);
		expect(payload.version).toBe(1);
		expect(Number.isNaN(Date.parse(payload.builtAt))).toBe(false);
		expect(payload.options).toEqual(SEARCH_INDEX_OPTIONS);
		expect(payload.options).toEqual({
			idField: "id",
			fields: ["title", "heading", "text"],
			storeFields: ["pageTitle", "heading", "path", "excerpt"],
			searchOptions: { prefix: true, fuzzy: 0.15, boost: { title: 3, heading: 2 }, combineWith: "AND" },
		});
	});

	it("holds a section per heading plus the page's opening, each with its address and a short excerpt", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const found = openIndex(await readIndex(await get(INDEX)));

		const [byHeading] = found.search("backups");
		expect(byHeading).toMatchObject({ pageTitle: "Install NextPress", heading: "Backups", path: "/install#backups" });
		expect(byHeading.excerpt).toBe("Copy the uploads folder before you update.");

		const [byTitle] = found.search("install");
		expect(byTitle).toMatchObject({ pageTitle: "Install NextPress", heading: "", path: "/install" });
		expect(byTitle.excerpt).toBe("Download the release and run it with pnpm.");

		const [byWord] = found.search("pnpm");
		expect(byWord.path).toBe("/install#install-nextpress");
	});

	it("never carries drafts, private, passworded or removed pages", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const response = await get(INDEX);
		const text = await response.text();
		for (const hidden of ["zebra", "Secret plans", "Private notes", "Locked", "Old news", "secret-plans", "private-notes", "old-news"]) {
			expect(text).not.toContain(hidden);
		}
		const found = openIndex(JSON.parse(text) as SearchIndexPayload);
		expect(found.search("zebra")).toEqual([]);
		expect(found.documentCount).toBeGreaterThan(0);
	});

	it("gives nested pages their full address, even under a draft parent", async () => {
		const guides = page({ slug: "guides", title: "Guides", status: "draft", blocks: [paragraph("n1", "Start here.")] });
		const nested = page({ slug: "backup", title: "Back up your site", parentId: guides.id, blocks: [heading("n2", "Back up your site", 1), paragraph("n3", "Copy the narwhal folder."), heading("n4", "Restore"), paragraph("n5", "Put the narwhal files back.")] });
		const get = await serve({ models: fakeModels({ pages: () => [guides, nested, aboutPage] }) });
		const found = openIndex(await readIndex(await get(INDEX)));
		expect(found.search("restore")[0]).toMatchObject({ pageTitle: "Back up your site", path: "/guides/backup#restore" });
		expect(found.search("websites")[0].path).toBe("/about");
		expect(found.search("start here")).toEqual([]);
	});

	it("answers 304 with no body when the browser's copy is still current", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		const first = await get(INDEX);
		const etag = first.headers.get("etag") ?? "";
		await first.arrayBuffer();

		const again = await get(INDEX, { "If-None-Match": etag });
		expect(again.status).toBe(304);
		expect(await again.text()).toBe("");
		expect(again.headers.get("etag")).toBe(etag);
		expect(again.headers.get("cache-control")).toBe(CACHE_CONTROL);

		for (const header of [etag.replace(/^W\//, ""), `W/"other", ${etag}`, "*"]) {
			expect((await get(INDEX, { "If-None-Match": header })).status).toBe(304);
		}
		const other = await get(INDEX, { "If-None-Match": 'W/"something-else"' });
		expect(other.status).toBe(200);
	});

	it("gives a new tag and the new words once the site's pages change", async () => {
		let current = [installPage, aboutPage];
		const get = await serve({ models: fakeModels({ pages: () => current }) });
		const first = await get(INDEX);
		const oldTag = first.headers.get("etag") ?? "";
		expect(openIndex(await readIndex(first)).search("quokkas")).toEqual([]);

		current = [installPage, { ...aboutPage, blocks: [paragraph("e", "We make quokkas.")], version: 2, updatedAt: new Date("2026-10-02T00:00:00Z") }];
		const changed = await get(INDEX, { "If-None-Match": oldTag });
		expect(changed.status).toBe(200);
		expect(changed.headers.get("etag")).not.toBe(oldTag);
		expect(openIndex(await readIndex(changed)).search("quokkas")[0].path).toBe("/about");
	});

	it("builds the first time it is asked, when nothing was built yet (a fresh start)", async () => {
		const counters: Counters = { builds: 0 };
		const get = await serve({ models: fakeModels({ pages: rows, counters }) });
		expect(counters.builds).toBe(0);
		const found = openIndex(await readIndex(await get(INDEX)));
		expect(counters.builds).toBe(1);
		expect(found.search("backups")[0].path).toBe("/install#backups");
		await (await get(INDEX)).arrayBuffer();
		expect(counters.builds).toBe(1);
	});

	it("shares one build between visitors who ask at the same moment", async () => {
		const counters: Counters = { builds: 0 };
		const get = await serve({ models: fakeModels({ pages: rows, counters }) });
		const responses = await Promise.all(Array.from({ length: 6 }, () => get(INDEX)));
		const bodies = await Promise.all(responses.map((response) => response.text()));
		expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200, 200]);
		expect(new Set(bodies).size).toBe(1);
		expect(counters.builds).toBe(1);
	});

	it("tells a browser with a current copy it is current even right after a restart, without building", async () => {
		const first = await serve({ models: fakeModels({ pages: rows }) });
		const etag = (await first(INDEX)).headers.get("etag") ?? "";

		const counters: Counters = { builds: 0 };
		const restarted = await serve({ models: fakeModels({ pages: rows, counters }) });
		const answer = await restarted(INDEX, { "If-None-Match": etag });
		expect(answer.status).toBe(304);
		expect(counters.builds).toBe(0);
	});

	it("is ready before the first visitor when a page change was announced", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		let current = [installPage, aboutPage];
		const counters: Counters = { builds: 0 };
		const models = fakeModels({ pages: () => current, counters });
		const get = await serve({ models });
		await (await get(INDEX)).arrayBuffer();
		expect(counters.builds).toBe(1);

		current = [installPage, { ...aboutPage, blocks: [paragraph("e", "We make quokkas.")], version: 2, updatedAt: new Date("2026-10-02T00:00:00Z") }];
		scheduleSearchIndexRebuild({ models, siteId: SITE.id });
		expect(counters.builds).toBe(1);
		await vi.advanceTimersByTimeAsync(2000);
		await vi.advanceTimersByTimeAsync(0);
		expect(counters.builds).toBe(2);

		const visitor = await get(INDEX);
		expect(openIndex(await readIndex(visitor)).search("quokkas")[0].path).toBe("/about");
		expect(counters.builds).toBe(2);
	});

	it("answers 404 when the address belongs to no site", async () => {
		const get = await serve({ models: fakeModels({ pages: rows, noSite: true }) });
		const response = await get(INDEX);
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ message: "Site not found" });
	});

	it("says so in plain words, logs the cause and keeps the error out of caches when the build fails", async () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
		const get = await serve({ models: fakeModels({ pages: rows, failBuild: true }) });
		const response = await get(INDEX);
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ message: "Search isn't available right now. Try again in a moment." });
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(logged).toHaveBeenCalledWith(
			expect.objectContaining({
				atFunction: "public.docsIndex",
				data: expect.objectContaining({ siteId: SITE.id, error: expect.objectContaining({ message: "the database went away" }) }),
			}),
		);
	});

	it("still answers the saved index at its own address, separate from the search API", async () => {
		const get = await serve({ models: fakeModels({ pages: rows }) });
		expect((await get(INDEX)).status).toBe(200);
	});
});
