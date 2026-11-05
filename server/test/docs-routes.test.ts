import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import express from "express";
import multer from "multer";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getZodSchema } from "@shared/zod-schema";
import type { BlockConfig } from "@shared/schema-types";
import type { DocsTree, DocsTreeItem } from "@shared/docs";
import { findDocsShell, readDocsShellContent } from "@shared/blocks/docs-shell-model";
import { authService, requireAuth } from "../auth";
import { CONFIG, getSiteSettings, parsePaginationParams, parseStatusParam } from "../config";
import type { Deps } from "../routes/shared/deps";
import { createDocsRoutes } from "../routes/docs.routes";
import { findPageByPath } from "../lib/page-paths/page-paths";
import { createPageTransferRoutes } from "../routes/page-transfer.routes";
import { ID, callAs, models, seedAccessFixture } from "./fixtures/access-fixture";

vi.mock("../lib/better-auth", () => ({
	auth: {
		api: {
			getSession: async ({ headers }: { headers: Headers }) => {
				const userId = headers.get("x-test-user");
				return userId ? { user: { id: userId } } : null;
			},
		},
	},
}));

/** The real docs routes (and page import, for the round trip) on the in-memory test database. */
let server: Server;
let baseUrl = "";
let call: ReturnType<typeof callAs>;

beforeAll(async () => {
	const uploadDir = mkdtempSync(path.join(tmpdir(), "np-docs-routes-"));
	const deps = {
		models,
		hooks: { doAction: () => undefined, applyFilters: (_name: string, value: unknown) => value },
		authService,
		requireAuth,
		CONFIG,
		parsePaginationParams,
		parseStatusParam,
		getSiteSettings,
		schemas: { pages: getZodSchema("pages") },
		upload: multer({ dest: uploadDir }),
		uploadDir,
	} as unknown as Deps;
	const app = express();
	app.use(express.json({ limit: "5mb" }));
	app.use("/api/docs", createDocsRoutes(deps));
	app.use("/api/page-transfer", createPageTransferRoutes(deps));
	server = createServer(app);
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	call = callAs(baseUrl);
});

afterAll(async () => {
	await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(async () => {
	await seedAccessFixture();
});

const admin = ID.mainAdmin;

const createDocs = async (): Promise<string> => {
	const created = await call({ userId: admin, method: "POST", path: "/api/docs", body: { siteId: ID.siteA, name: "Acme Docs", slug: "docs" } });
	expect(created.status).toBe(201);
	return String(created.body.homeId);
};

const addItem = async ({ homeId, parentId, title, kind = "page", position }: { homeId: string; parentId: string; title: string; kind?: "page" | "group"; position?: number }): Promise<DocsTreeItem> => {
	const added = await call({ userId: admin, method: "POST", path: `/api/docs/${homeId}/items`, body: { parentId, title, kind, position } });
	expect(added.status).toBe(201);
	return added.body.item as DocsTreeItem;
};

const tree = async (homeId: string): Promise<DocsTree> => {
	const read = await call({ userId: admin, path: `/api/docs/${homeId}/tree` });
	expect(read.status).toBe(200);
	return read.body as unknown as DocsTree;
};

const titles = (items: DocsTreeItem[]): string[] => items.map((item) => item.title);

describe("docs on an address of their own", () => {
	it("addresses its pages from the site root, and still opens them at the addresses they would have had", async () => {
		const created = await call({ userId: admin, method: "POST", path: "/api/docs", body: { siteId: ID.siteA, name: "Acme Docs", slug: "docs", ownAddress: true } });
		expect(created.status).toBe(201);
		const homeId = String(created.body.homeId);
		const group = await addItem({ homeId, parentId: homeId, title: "Getting started", kind: "group" });
		const install = await addItem({ homeId, parentId: group.id, title: "Install" });

		expect(install.path).toBe("/getting-started/install");
		const read = await tree(homeId);
		expect(read.home).toMatchObject({ ownAddress: true, path: "/docs" });

		for (const path of ["getting-started/install", "docs/getting-started/install", "install"]) {
			expect((await findPageByPath({ models, siteId: ID.siteA, path }))?.page.id, path).toBe(install.id);
		}
		expect((await findPageByPath({ models, siteId: ID.siteA, path: "getting-started/install" }))?.path).toBe("getting-started/install");
	});

	it("keeps the home's part in addresses for docs on a site's own pages", async () => {
		const homeId = await createDocs();
		const install = await addItem({ homeId, parentId: homeId, title: "Install" });
		expect(install.path).toBe("/docs/install");
		expect((await tree(homeId)).home).not.toHaveProperty("ownAddress");
	});
});

describe("docs: create, list and the navigation tree", () => {
	it("creates a docs home and lists it", async () => {
		const homeId = await createDocs();
		const listed = await call({ userId: admin, path: `/api/docs?siteId=${ID.siteA}` });
		expect(listed.status).toBe(200);
		expect(listed.body.docs).toEqual([
			expect.objectContaining({ homeId, name: "Acme Docs", path: "/docs", pageCount: 1, searchOn: true, status: "draft" }),
		]);
		const home = await models.pages.findById(homeId);
		const shell = findDocsShell((home?.blocks ?? []) as BlockConfig[]);
		expect(readDocsShellContent(shell?.content)).toMatchObject({ inherit: false, title: "Acme Docs" });
	});

	it("adds pages and groups, orders, moves, renames, hides and deletes them", async () => {
		const homeId = await createDocs();
		const group = await addItem({ homeId, parentId: homeId, title: "Getting started", kind: "group" });
		expect(group).toMatchObject({ kind: "group", path: "/docs/getting-started", status: "draft" });
		const install = await addItem({ homeId, parentId: group.id, title: "Install" });
		expect(install.path).toBe("/docs/getting-started/install");
		const quick = await addItem({ homeId, parentId: group.id, title: "Quickstart", position: 0 });
		expect(titles((await tree(homeId)).home.children[0]!.children)).toEqual(["Quickstart", "Install"]);

		const reordered = await call({ userId: admin, method: "PUT", path: `/api/docs/${homeId}/order`, body: { parentId: group.id, orderedIds: [install.id, quick.id] } });
		expect(reordered.status).toBe(200);
		expect(titles((await tree(homeId)).home.children[0]!.children)).toEqual(["Install", "Quickstart"]);

		const upgrade = await addItem({ homeId, parentId: homeId, title: "Upgrade" });
		const moved = await call({ userId: admin, method: "PATCH", path: `/api/docs/items/${upgrade.id}`, body: { parentId: group.id } });
		expect(moved.status).toBe(200);
		expect((moved.body.item as DocsTreeItem).path).toBe("/docs/getting-started/upgrade");

		const renamed = await call({ userId: admin, method: "PATCH", path: `/api/docs/items/${upgrade.id}`, body: { title: "Upgrading", slug: "upgrading" } });
		expect(renamed.body.item).toMatchObject({ title: "Upgrading", path: "/docs/getting-started/upgrading" });

		const hidden = await call({ userId: admin, method: "PATCH", path: `/api/docs/items/${quick.id}`, body: { hidden: true } });
		expect(hidden.body.item).toMatchObject({ hidden: true });
		expect(titles((await tree(homeId)).home.children[0]!.children)).toEqual(["Install", "Quickstart", "Upgrading"]);

		const refusedDelete = await call({ userId: admin, method: "DELETE", path: `/api/docs/items/${group.id}` });
		expect(refusedDelete.status).toBe(409);
		const deleted = await call({ userId: admin, method: "DELETE", path: `/api/docs/items/${upgrade.id}` });
		expect(deleted.status).toBe(200);
		expect(titles((await tree(homeId)).home.children[0]!.children)).toEqual(["Install", "Quickstart"]);
	});

	it("refuses an order that doesn't match the pages, and a move under itself", async () => {
		const homeId = await createDocs();
		const group = await addItem({ homeId, parentId: homeId, title: "Guides", kind: "group" });
		const child = await addItem({ homeId, parentId: group.id, title: "Pages" });
		const wrongOrder = await call({ userId: admin, method: "PUT", path: `/api/docs/${homeId}/order`, body: { parentId: group.id, orderedIds: [child.id, homeId] } });
		expect(wrongOrder.status).toBe(409);
		const loop = await call({ userId: admin, method: "PATCH", path: `/api/docs/items/${group.id}`, body: { parentId: child.id } });
		expect(loop.status).toBe(400);
		const homeAsGroup = await call({ userId: admin, method: "PATCH", path: `/api/docs/items/${homeId}`, body: { kind: "group" } });
		expect(homeAsGroup.status).toBe(400);
	});

	it("finds the docs a page sits in", async () => {
		const homeId = await createDocs();
		const page = await addItem({ homeId, parentId: homeId, title: "Install" });
		const found = await call({ userId: admin, path: `/api/docs/items/${page.id}` });
		expect(found.status).toBe(200);
		expect((found.body as unknown as DocsTree).home.id).toBe(homeId);
	});
});

describe("docs: settings", () => {
	it("changes only the home shell; pages under it keep inheriting", async () => {
		const homeId = await createDocs();
		const page = await addItem({ homeId, parentId: homeId, title: "Install" });
		const saved = await call({
			userId: admin,
			method: "PUT",
			path: `/api/docs/${homeId}/settings`,
			body: { title: "Acme", links: [{ label: "GitHub", url: "https://github.com/acme" }], features: { toc: false }, search: { placeholder: "Find anything" } },
		});
		expect(saved.status).toBe(200);
		expect(saved.body.settings).toMatchObject({
			title: "Acme",
			links: [{ label: "GitHub", url: "https://github.com/acme" }],
			features: { sidebar: true, toc: false, prevNext: true, copyPage: true },
			search: { show: true, placeholder: "Find anything" },
		});
		expect((await tree(homeId)).settings.title).toBe("Acme");
		const child = await models.pages.findById(page.id);
		expect(readDocsShellContent(findDocsShell((child?.blocks ?? []) as BlockConfig[])?.content).inherit).toBe(true);
	});
});

describe("docs: one page file for the whole docs", () => {
	it("exports a docs and imports it on another site with the same tree, order and pages", async () => {
		const homeId = await createDocs();
		const group = await addItem({ homeId, parentId: homeId, title: "Getting started", kind: "group" });
		await addItem({ homeId, parentId: group.id, title: "Install" });
		await addItem({ homeId, parentId: group.id, title: "Upgrade" });

		const exported = await fetch(`${baseUrl}/api/docs/${homeId}/export?files=0`, { headers: { "x-test-user": admin } });
		expect(exported.status).toBe(200);
		expect(exported.headers.get("content-disposition")).toContain("docs-docs.nextpress-page.json");
		const file = await exported.text();

		const form = new FormData();
		form.append("siteId", ID.siteB);
		form.append("package", new Blob([file], { type: "application/json" }), "docs.nextpress-page.json");
		const imported = await fetch(`${baseUrl}/api/page-transfer/import`, { method: "POST", headers: { "x-test-user": ID.siteBOwner }, body: form });
		expect(imported.status).toBe(201);

		const listed = await call({ userId: ID.siteBOwner, path: `/api/docs?siteId=${ID.siteB}` });
		const docsB = listed.body.docs as Array<{ homeId: string; pageCount: number; name: string }>;
		expect(docsB).toHaveLength(1);
		expect(docsB[0]).toMatchObject({ name: "Acme Docs", pageCount: 4 });
		const treeB = await call({ userId: ID.siteBOwner, path: `/api/docs/${docsB[0]!.homeId}/tree` });
		const homeB = (treeB.body as unknown as DocsTree).home;
		expect(titles(homeB.children)).toEqual(["Getting started"]);
		expect(homeB.children[0]).toMatchObject({ kind: "group" });
		expect(titles(homeB.children[0]!.children)).toEqual(["Install", "Upgrade"]);
	});
});

describe("docs: who may do what", () => {
	it("refuses another site's editor, a subscriber and a signed-out visitor", async () => {
		const homeId = await createDocs();
		expect((await call({ userId: ID.editorB, path: `/api/docs/${homeId}/tree` })).status).toBe(403);
		expect((await call({ userId: ID.subscriberA, path: `/api/docs/${homeId}/tree` })).status).toBe(403);
		expect((await call({ userId: null, path: `/api/docs/${homeId}/tree` })).status).toBe(401);
		const intoOtherSite = await call({ userId: ID.editorB, method: "POST", path: "/api/docs", body: { siteId: ID.siteA, name: "Mine" } });
		expect(intoOtherSite.status).toBe(403);
		const addAcross = await call({ userId: ID.editorB, method: "POST", path: `/api/docs/${homeId}/items`, body: { parentId: homeId, title: "x", kind: "page" } });
		expect(addAcross.status).toBe(403);
	});
});
