import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./http-client.js";
import { NextpressError } from "./nextpress-error.js";

describe("createHttpClient", () => {
	it("sends Bearer token and parses JSON", async () => {
		const fetchMock = vi.fn(async () => Response.json({ posts: [], total: 0 }));

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test_key",
			fetch: fetchMock as typeof fetch,
			timeout: 5000,
		});

		const result = await http.request<{ posts: unknown[]; total: number }>("/api/posts");

		expect(result.total).toBe(0);
		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toContain("/api/posts");
		expect(init.headers).toMatchObject({
			Authorization: "Bearer np_test_key",
		});
	});

	it("throws NextpressError on API failure", async () => {
		const fetchMock = vi.fn(async () =>
			Response.json(
				{ message: "Unauthorized", code: "AUTH_REQUIRED" },
				{
					status: 401,
				},
			),
		);

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "bad_key",
			fetch: fetchMock as typeof fetch,
			timeout: 5000,
		});

		await expect(http.request("/api/posts")).rejects.toBeInstanceOf(NextpressError);
	});

	it("keeps configured api key when caller passes Authorization header", async () => {
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const headers = init?.headers as Record<string, string>;
			expect(headers.Authorization).toBe("Bearer real_key");
			return Response.json({ status: "ok", timestamp: "now" });
		});

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: "real_key",
			fetch: fetchMock as typeof fetch,
			timeout: 5000,
		});

		await http.request("/api/health", {
			headers: { Authorization: "Bearer attacker_key" },
		});
	});
});
