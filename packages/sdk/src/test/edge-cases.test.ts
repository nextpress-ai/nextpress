import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../client/http-client.js";
import { NextpressError } from "../client/nextpress-error.js";
import { createNextpress } from "../create-nextpress.js";
import { createMockFetch, mockIds } from "./mock-fetch.js";

describe("edge cases", () => {
	it("handles 204 No Content responses", async () => {
		const { fetchMock } = createMockFetch([
			{
				path: "/api/empty",
				handler: () => new Response(null, { status: 204 }),
			},
		]);

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			fetch: fetchMock,
			timeout: 5000,
		});

		const result = await http.request<undefined>("/api/empty");
		expect(result).toBeUndefined();
	});

	it("parses plain-text API error bodies", async () => {
		const { fetchMock } = createMockFetch([
			{
				path: "/api/fail",
				handler: () => new Response("Setup Required", { status: 428 }),
			},
		]);

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			fetch: fetchMock,
			timeout: 5000,
		});

		await expect(http.request("/api/fail")).rejects.toMatchObject({
			status: 428,
			message: "Setup Required",
		});
	});

	it("returns text bodies when content-type is not JSON", async () => {
		const { fetchMock } = createMockFetch([
			{
				path: "/api/text",
				handler: () =>
					new Response("ok", {
						status: 200,
						headers: { "Content-Type": "text/plain" },
					}),
			},
		]);

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			fetch: fetchMock,
			timeout: 5000,
		});

		const result = await http.request<string>("/api/text");
		expect(result).toBe("ok");
	});

	it("maps fetch aborts to timeout NextpressError", async () => {
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const signal = init?.signal;
			await new Promise((_resolve, reject) => {
				signal?.addEventListener("abort", () => {
					const error = new Error("Aborted");
					error.name = "AbortError";
					reject(error);
				});
			});
			return Response.json({});
		});

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			fetch: fetchMock as typeof fetch,
			timeout: 20,
		});

		await expect(http.request("/api/slow")).rejects.toMatchObject({
			status: 408,
		});
	});

	it("rejects pagination above schema max before network call", async () => {
		const fetchMock = vi.fn();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			siteId: mockIds.siteId,
			fetch: fetchMock as typeof fetch,
		});

		await expect(nextpress.posts.list({ per_page: 500 })).rejects.toThrow(
			"Invalid posts.list params",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects invalid UUID params before network call", async () => {
		const fetchMock = vi.fn();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			siteId: mockIds.siteId,
			fetch: fetchMock as typeof fetch,
		});

		await expect(nextpress.posts.get({ id: "not-a-uuid" })).rejects.toThrow("Invalid posts.get id");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("normalizes baseUrl trailing slashes", async () => {
		const { fetchMock, calls } = createMockFetch([
			{
				path: "/api/health",
				handler: () => Response.json({ status: "ok", timestamp: "now" }),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com///",
			apiKey: "np_test",
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		await nextpress.health.check();
		const calledUrl = new URL(calls[0]?.url ?? "");
		expect(calledUrl.origin + calledUrl.pathname).toBe("https://cms.example.com/api/health");
	});

	it("allows explicit siteId to override client default", async () => {
		const { fetchMock, calls } = createMockFetch([
			{
				path: "/api/posts",
				handler: () =>
					Response.json({ posts: [], total: 0, page: 1, per_page: 10, total_pages: 0 }),
			},
		]);

		const overrideSiteId = "00000000-0000-4000-8000-000000000099";
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		await nextpress.posts.list({ siteId: overrideSiteId });
		expect(calls[0]?.url).toContain(`siteId=${overrideSiteId}`);
	});

	it("supports deeply nested block trees in create payloads", async () => {
		const { fetchMock } = createMockFetch([
			{
				method: "POST",
				path: "/api/pages",
				handler: (request) =>
					Response.json(
						{ id: mockIds.pageId, ...(request.body as Record<string, unknown>) },
						{ status: 201 },
					),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		const blocks = [
			nextpress.blocks.columns({
				children: [
					nextpress.blocks.container({
						children: [
							nextpress.blocks.heading({ text: "Deep", level: 3 }),
							nextpress.blocks.markdown({ value: "## Nested" }),
						],
					}),
				],
			}),
		];

		const page = await nextpress.pages.create({ title: "Deep Tree", blocks });
		expect(Array.isArray(page.blocks)).toBe(true);
	});

	it("preserves JSON error codes from structured API responses", async () => {
		const { fetchMock } = createMockFetch([
			{
				method: "POST",
				path: "/api/pages",
				handler: () =>
					Response.json({ message: "Slug taken", code: "PAGE_SLUG_EXISTS" }, { status: 409 }),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test",
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		try {
			await nextpress.pages.create({ title: "Conflict" });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(NextpressError);
			if (error instanceof NextpressError) {
				expect(error.status).toBe(409);
				expect(error.code).toBe("PAGE_SLUG_EXISTS");
			}
		}
	});
});
