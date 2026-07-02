import { vi } from "vitest";

export type MockRequest = {
	url: string;
	method: string;
	headers: Record<string, string>;
	body: unknown;
};

export type MockRouteHandler = (request: MockRequest) => Response | Promise<Response>;

export type MockRoute = {
	method?: string;
	path: string | RegExp;
	handler: MockRouteHandler;
};

const DEFAULT_SITE_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_BLOG_ID = "00000000-0000-4000-8000-000000000002";
const DEFAULT_POST_ID = "00000000-0000-4000-8000-000000000003";
const DEFAULT_PAGE_ID = "00000000-0000-4000-8000-000000000004";

export const mockIds = {
	siteId: DEFAULT_SITE_ID,
	blogId: DEFAULT_BLOG_ID,
	postId: DEFAULT_POST_ID,
	pageId: DEFAULT_PAGE_ID,
};

/** Parses fetch init into a normalized mock request shape. */
export function parseMockRequest(url: string, init?: RequestInit): MockRequest {
	const headers: Record<string, string> = {};
	const rawHeaders = init?.headers;
	if (rawHeaders instanceof Headers) {
		rawHeaders.forEach((value, key) => {
			headers[key.toLowerCase()] = value;
		});
	} else if (Array.isArray(rawHeaders)) {
		for (const [key, value] of rawHeaders) {
			headers[key.toLowerCase()] = value;
		}
	} else if (rawHeaders) {
		for (const [key, value] of Object.entries(rawHeaders)) {
			headers[key.toLowerCase()] = value;
		}
	}

	let body: unknown = init?.body;
	if (typeof body === "string") {
		try {
			body = JSON.parse(body);
		} catch {
			/* keep raw string */
		}
	}

	return {
		url,
		method: init?.method ?? "GET",
		headers,
		body,
	};
}

/** Matches a mock route against method and pathname. */
export function matchRoute(route: MockRoute, request: MockRequest): boolean {
	const pathname = new URL(request.url).pathname;
	const methodMatches = !route.method || route.method === request.method;
	const pathMatches =
		typeof route.path === "string" ? pathname === route.path : route.path.test(pathname);
	return methodMatches && pathMatches;
}

/**
 * Creates a vi.fn fetch mock that routes requests through registered handlers.
 * Unmatched routes return 404 JSON.
 */
export function createMockFetch(routes: MockRoute[]) {
	const calls: MockRequest[] = [];

	const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
		const request = parseMockRequest(url, init);
		calls.push(request);

		for (const route of routes) {
			if (matchRoute(route, request)) {
				return route.handler(request);
			}
		}

		return Response.json(
			{ message: `No mock for ${request.method} ${new URL(url).pathname}` },
			{
				status: 404,
			},
		);
	});

	return { fetchMock: fetchMock as typeof fetch, calls };
}

/** Standard in-memory API routes for integration-style tests. */
export function createDefaultMockApi() {
	const posts: Record<string, Record<string, unknown>> = {};
	const pages: Record<string, Record<string, unknown>> = {};

	return createMockFetch([
		{
			path: "/api/health",
			handler: () => Response.json({ status: "ok", timestamp: new Date().toISOString() }),
		},
		{
			method: "GET",
			path: "/api/posts",
			handler: (request) => {
				const url = new URL(request.url);
				const page = Number(url.searchParams.get("page") ?? 1);
				const items = Object.values(posts);
				return Response.json({
					posts: items,
					total: items.length,
					page,
					per_page: 10,
					total_pages: 1,
				});
			},
		},
		{
			method: "POST",
			path: "/api/posts",
			handler: (request) => {
				const body = request.body as Record<string, unknown>;
				const id = mockIds.postId;
				posts[id] = { id, ...body, status: body.status ?? "draft" };
				return Response.json(posts[id], { status: 201 });
			},
		},
		{
			method: "GET",
			path: /^\/api\/posts\/[0-9a-f-]+$/,
			handler: (request) => {
				const id = new URL(request.url).pathname.split("/").pop() ?? "";
				const post = posts[id];
				if (!post) {
					return Response.json({ message: "Post not found" }, { status: 404 });
				}
				return Response.json(post);
			},
		},
		{
			method: "PUT",
			path: /^\/api\/posts\/[0-9a-f-]+$/,
			handler: (request) => {
				const id = new URL(request.url).pathname.split("/").pop() ?? "";
				if (!posts[id]) {
					return Response.json({ message: "Post not found" }, { status: 404 });
				}
				posts[id] = { ...posts[id], ...(request.body as Record<string, unknown>) };
				return Response.json(posts[id]);
			},
		},
		{
			method: "DELETE",
			path: /^\/api\/posts\/[0-9a-f-]+$/,
			handler: (request) => {
				const id = new URL(request.url).pathname.split("/").pop() ?? "";
				delete posts[id];
				return Response.json({ message: "Post deleted successfully" });
			},
		},
		{
			method: "GET",
			path: "/api/pages",
			handler: () =>
				Response.json({
					pages: Object.values(pages),
					total: Object.keys(pages).length,
					page: 1,
					per_page: 10,
					total_pages: 1,
				}),
		},
		{
			method: "POST",
			path: "/api/pages",
			handler: (request) => {
				const body = request.body as Record<string, unknown>;
				const id = mockIds.pageId;
				pages[id] = {
					id,
					siteId: mockIds.siteId,
					...body,
					status: body.status ?? "draft",
				};
				return Response.json(pages[id], { status: 201 });
			},
		},
		{
			method: "GET",
			path: /^\/api\/pages\/.+$/,
			handler: (request) => {
				const slugOrId = decodeURIComponent(
					new URL(request.url).pathname.replace("/api/pages/", ""),
				);
				const page =
					pages[mockIds.pageId] ?? Object.values(pages).find((item) => item.slug === slugOrId);
				if (!page) {
					return Response.json({ message: "Page not found" }, { status: 404 });
				}
				return Response.json(page);
			},
		},
		{
			method: "PUT",
			path: /^\/api\/pages\/[0-9a-f-]+$/,
			handler: (request) => {
				const id = new URL(request.url).pathname.split("/").pop() ?? "";
				if (!pages[id]) {
					return Response.json({ message: "Page not found" }, { status: 404 });
				}
				pages[id] = { ...pages[id], ...(request.body as Record<string, unknown>) };
				return Response.json(pages[id]);
			},
		},
		{
			method: "POST",
			path: "/api/media",
			handler: (request) => {
				const isFormData = request.body instanceof FormData;
				return Response.json(
					{
						id: "00000000-0000-4000-8000-000000000010",
						filename: "upload.png",
						originalName: isFormData ? "upload.png" : "unknown",
						mimeType: "image/png",
						size: 1024,
						url: "/uploads/upload.png",
					},
					{ status: 201 },
				);
			},
		},
		{
			method: "GET",
			path: "/api/public/homepage",
			handler: () =>
				Response.json({
					id: mockIds.pageId,
					title: "Home",
					slug: "home",
					status: "publish",
					siteId: mockIds.siteId,
				}),
		},
		{
			method: "GET",
			path: "/api/auth/user",
			handler: (request) => {
				if (!request.headers.authorization?.startsWith("Bearer ")) {
					return Response.json({ message: "Unauthorized" }, { status: 401 });
				}
				return Response.json({
					id: "00000000-0000-4000-8000-000000000099",
					username: "admin",
					email: "admin@example.com",
				});
			},
		},
	]);
}
