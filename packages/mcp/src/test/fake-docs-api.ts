import { SITE_ID } from "./fake-nextpress-api.js";
import type { JsonObject } from "./json-value.js";

/**
 * A NextPress docs server held in memory, reached through `fetch`, so the MCP docs tools run the real
 * SDK over it. It keeps the server's rules: addresses follow parents, the home stays on top, an order
 * must list the pages exactly and a page still holds children only when it is a group.
 */

export const DOCS_HOME_ID = "00000000-0000-4000-8000-0000000000e1";
export const DOCS_GROUP_ID = "00000000-0000-4000-8000-0000000000e2";
export const DOCS_INSTALL_ID = "00000000-0000-4000-8000-0000000000e3";
export const DOCS_UPGRADE_ID = "00000000-0000-4000-8000-0000000000e4";

export type FakeDocsRow = {
	id: string;
	parentId: string | null;
	title: string;
	slug: string;
	status: string;
	menuOrder: number;
	/** The home page of a docs has no parent and is the top of its sidebar. */
	home: boolean;
	group: boolean;
	hidden: boolean;
};

export type FakeDocsRequest = { method: string; path: string; query: URLSearchParams; body: JsonObject };

export type FakeDocsApi = {
	fetch: typeof fetch;
	requests: FakeDocsRequest[];
	rows: Map<string, FakeDocsRow>;
	settings: Map<string, JsonObject>;
	/** Answers the next request with this status and message, the way a server fault would. */
	failNext: { status: number; message: string } | undefined;
};

type Route = {
	method: string;
	pattern: RegExp;
	handle: (params: { match: RegExpMatchArray; request: FakeDocsRequest; api: FakeDocsApi }) => Response;
};

const json = (body: object, status = 200): Response => Response.json(body, { status });

const refusal = (message: string, status: number): Response => json({ message }, status);

const defaultSettings = (title: string): JsonObject => ({
	title,
	logoUrl: "",
	logoDarkUrl: "",
	links: [],
	button: { label: "", url: "" },
	search: { show: true, label: "Search", placeholder: "Search the docs" },
	features: { sidebar: true, toc: true, prevNext: true, copyPage: true },
});

const row = (values: Partial<FakeDocsRow> & Pick<FakeDocsRow, "id" | "title" | "slug">): FakeDocsRow => ({
	parentId: null,
	status: "draft",
	menuOrder: 0,
	home: false,
	group: false,
	hidden: false,
	...values,
});

/** The address of a row: its parents' slugs, then its own. */
const addressOf = (rows: Map<string, FakeDocsRow>, item: FakeDocsRow): string => {
	const parent = item.parentId ? rows.get(item.parentId) : undefined;
	return parent ? `${addressOf(rows, parent)}/${item.slug}` : `/${item.slug}`;
};

const childrenOf = (rows: Map<string, FakeDocsRow>, parentId: string): FakeDocsRow[] =>
	[...rows.values()]
		.filter((item) => item.parentId === parentId && !item.home)
		.sort((a, b) => a.menuOrder - b.menuOrder || a.title.localeCompare(b.title));

const itemOf = (rows: Map<string, FakeDocsRow>, item: FakeDocsRow): object => ({
	id: item.id,
	title: item.title,
	slug: item.slug,
	path: addressOf(rows, item),
	parentId: item.home ? null : item.parentId,
	menuOrder: item.menuOrder,
	status: item.status,
	kind: item.group ? "group" : "page",
	hidden: item.hidden,
	children: childrenOf(rows, item.id).map((child) => itemOf(rows, child)),
});

const isUnder = (rows: Map<string, FakeDocsRow>, item: FakeDocsRow, ancestorId: string): boolean => {
	let current = item.parentId;
	while (current) {
		if (current === ancestorId) return true;
		current = rows.get(current)?.parentId ?? null;
	}
	return false;
};

const slugOf = (text: string): string =>
	text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const treeFor = (api: FakeDocsApi, home: FakeDocsRow) => ({
	home: itemOf(api.rows, home),
	settings: api.settings.get(home.id) ?? defaultSettings(home.title),
});

const summaryOf = (api: FakeDocsApi, home: FakeDocsRow) => {
	const settings = api.settings.get(home.id) ?? defaultSettings(home.title);
	const search = settings.search as { show: boolean };
	return {
		homeId: home.id,
		siteId: SITE_ID,
		name: String(settings.title),
		path: addressOf(api.rows, home),
		pageCount: 1 + [...api.rows.values()].filter((item) => !item.home).length,
		searchOn: search.show,
		status: home.status,
	};
};

const homeRows = (api: FakeDocsApi): FakeDocsRow[] => [...api.rows.values()].filter((item) => item.home);

/** The home page at the top of the docs a row sits in. */
const homeOf = (api: FakeDocsApi, item: FakeDocsRow): FakeDocsRow => {
	let current = item;
	while (current.parentId && api.rows.get(current.parentId)) current = api.rows.get(current.parentId) as FakeDocsRow;
	return current;
};

const readBody = (init: RequestInit | undefined): JsonObject =>
	typeof init?.body === "string" ? (JSON.parse(init.body) as JsonObject) : {};

const routes: Route[] = [
	{
		method: "GET",
		pattern: /^\/api\/docs$/,
		handle: ({ api }) => json({ docs: homeRows(api).map((home) => summaryOf(api, home)) }),
	},
	{
		method: "POST",
		pattern: /^\/api\/docs$/,
		handle: ({ api, request }) => {
			const name = String(request.body.name);
			const id = `00000000-0000-4000-8000-0000000f${String(api.rows.size).padStart(4, "0")}`;
			const home = row({ id, title: name, slug: String(request.body.slug) || slugOf(name), home: true });
			api.rows.set(id, home);
			api.settings.set(id, defaultSettings(name));
			return json({ docs: summaryOf(api, home), homeId: id }, 201);
		},
	},
	{
		method: "GET",
		pattern: /^\/api\/docs\/([^/]+)\/tree$/,
		handle: ({ match, api }) => {
			const home = api.rows.get(match[1] ?? "");
			return home?.home ? json(treeFor(api, home)) : refusal("These docs no longer exist.", 404);
		},
	},
	{
		method: "GET",
		pattern: /^\/api\/docs\/items\/([^/]+)$/,
		handle: ({ match, api }) => {
			const item = api.rows.get(match[1] ?? "");
			return item ? json(treeFor(api, homeOf(api, item))) : refusal("That page isn't part of any docs.", 404);
		},
	},
	{
		method: "PUT",
		pattern: /^\/api\/docs\/([^/]+)\/settings$/,
		handle: ({ match, api, request }) => {
			const home = api.rows.get(match[1] ?? "");
			if (!home) return refusal("These docs no longer exist.", 404);
			const current = api.settings.get(home.id) ?? defaultSettings(home.title);
			const next = {
				...current,
				...request.body,
				search: { ...(current.search as object), ...(request.body.search as object | undefined) },
				features: { ...(current.features as object), ...(request.body.features as object | undefined) },
			};
			api.settings.set(home.id, next);
			return json({ settings: next });
		},
	},
	{
		method: "POST",
		pattern: /^\/api\/docs\/([^/]+)\/items$/,
		handle: ({ api, request }) => {
			const parent = api.rows.get(String(request.body.parentId));
			if (!parent) return refusal("That page isn't part of these docs any more. Refresh and try again.", 404);
			const title = String(request.body.title);
			const slug = typeof request.body.slug === "string" && request.body.slug ? request.body.slug : slugOf(title);
			if ([...api.rows.values()].some((item) => item.slug === slug)) {
				return refusal(`Another page already uses "${slug}". Pick a different address.`, 409);
			}
			const id = `00000000-0000-4000-8000-0000000f${String(api.rows.size).padStart(4, "0")}`;
			const kind = request.body.kind === "group" ? "group" : "page";
			const created = row({
				id,
				parentId: parent.id,
				title,
				slug,
				menuOrder: childrenOf(api.rows, parent.id).length,
				group: kind === "group",
			});
			api.rows.set(id, created);
			return json({ item: itemOf(api.rows, created) }, 201);
		},
	},
	{
		method: "PATCH",
		pattern: /^\/api\/docs\/items\/([^/]+)$/,
		handle: ({ match, api, request }) => {
			const item = api.rows.get(match[1] ?? "");
			if (!item) return refusal("That page isn't part of these docs any more. Refresh and try again.", 404);
			const body = request.body;
			if (typeof body.title === "string") item.title = body.title;
			if (typeof body.slug === "string") {
				const taken = [...api.rows.values()].some((other) => other.slug === body.slug && other.id !== item.id);
				if (taken) return refusal(`Another page already uses "${body.slug}". Pick a different address.`, 409);
				item.slug = body.slug;
			}
			if (typeof body.parentId === "string" && body.parentId !== item.parentId) {
				if (item.home) return refusal("The docs home stays at the top.", 400);
				if (body.parentId === item.id || isUnder(api.rows, api.rows.get(body.parentId) ?? item, item.id)) {
					return refusal("A page can't move under itself or a page inside it.", 400);
				}
				item.parentId = body.parentId;
				item.menuOrder = childrenOf(api.rows, body.parentId).length;
			}
			if (typeof body.hidden === "boolean") {
				if (item.home && body.hidden) return refusal("The docs home is always a page in the sidebar.", 400);
				item.hidden = body.hidden;
			}
			if (body.kind === "group" || body.kind === "page") {
				if (item.home && body.kind === "group") return refusal("The docs home is always a page in the sidebar.", 400);
				item.group = body.kind === "group";
			}
			return json({ item: itemOf(api.rows, item) });
		},
	},
	{
		method: "DELETE",
		pattern: /^\/api\/docs\/items\/([^/]+)$/,
		handle: ({ match, api }) => {
			const item = api.rows.get(match[1] ?? "");
			if (!item) return refusal("That page isn't part of these docs any more. Refresh and try again.", 404);
			if (childrenOf(api.rows, item.id).length > 0) return refusal("Move or delete the pages under this one first.", 409);
			api.rows.delete(item.id);
			return json({ ok: true });
		},
	},
	{
		method: "PUT",
		pattern: /^\/api\/docs\/([^/]+)\/order$/,
		handle: ({ api, request }) => {
			const parentId = String(request.body.parentId);
			const current = childrenOf(api.rows, parentId).map((item) => item.id);
			const ordered = (request.body.orderedIds as string[]) ?? [];
			const exact =
				current.length === ordered.length &&
				new Set(ordered).size === current.length &&
				ordered.every((id) => current.includes(id));
			if (!exact) {
				return refusal("The pages changed while you were moving them. Refresh and try again.", 409);
			}
			ordered.forEach((id, index) => {
				const item = api.rows.get(id);
				if (item) item.menuOrder = index;
			});
			return json({ ok: true });
		},
	},
];

/**
 * Builds the fake docs server. By default it holds one docs, "Acme Docs": a group "Getting started"
 * with the page "Install"  under it, and the page "Upgrade" at the top.
 */
export const createFakeDocsApi = ({ withDocs = true }: { withDocs?: boolean } = {}): FakeDocsApi => {
	const api: FakeDocsApi = {
		fetch: ((input: string | URL | Request, init?: RequestInit) => respond(input, init)) as typeof fetch,
		requests: [],
		rows: new Map(),
		settings: new Map(),
		failNext: undefined,
	};

	if (withDocs) {
		const home = row({ id: DOCS_HOME_ID, title: "Acme Docs", slug: "docs", home: true, status: "draft" });
		const group = row({ id: DOCS_GROUP_ID, parentId: DOCS_HOME_ID, title: "Getting started", slug: "getting-started", group: true });
		const install = row({
			id: DOCS_INSTALL_ID,
			parentId: DOCS_GROUP_ID,
			title: "Install",
			slug: "install",
		});
		const upgrade = row({ id: DOCS_UPGRADE_ID, parentId: DOCS_HOME_ID, title: "Upgrade", slug: "upgrade", menuOrder: 1 });
		for (const item of [home, group, install, upgrade]) api.rows.set(item.id, item);
		api.settings.set(DOCS_HOME_ID, defaultSettings("Acme Docs"));
	}

	const respond = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
		const url = new URL(String(input));
		const request: FakeDocsRequest = {
			method: init?.method ?? "GET",
			path: url.pathname,
			query: url.searchParams,
			body: readBody(init),
		};
		api.requests.push(request);
		if (api.failNext) {
			const { status, message } = api.failNext;
			api.failNext = undefined;
			return refusal(message, status);
		}
		for (const route of routes) {
			const match = url.pathname.match(route.pattern);
			if (match && route.method === request.method) return route.handle({ match, request, api });
		}
		return refusal(`No fake route for ${request.method} ${url.pathname}`, 404);
	};

	return api;
};
