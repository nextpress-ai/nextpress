import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../client/http-client.js";
import { createNextpress } from "../create-nextpress.js";
import { createMockFetch, mockIds } from "./mock-fetch.js";

const SECRET_KEY = "np_secret_abc123_do_not_leak";

describe("security", () => {
	it("does not expose apiKey on the public client config", () => {
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: vi.fn() as typeof fetch,
		});

		expect(nextpress.config).toEqual({
			baseUrl: "https://cms.example.com",
			siteId: mockIds.siteId,
		});
		expect(JSON.stringify(nextpress.config)).not.toContain(SECRET_KEY);
	});

	it("sends apiKey only in Authorization header, never in query or body", async () => {
		const { fetchMock, calls } = createMockFetch([
			{
				method: "POST",
				path: "/api/posts",
				handler: (request) => {
					const url = new URL(request.url);
					expect(url.searchParams.has("apiKey")).toBe(false);
					expect(JSON.stringify(request.body)).not.toContain(SECRET_KEY);
					expect(request.headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
					return Response.json({ id: mockIds.postId, title: "Secure" }, { status: 201 });
				},
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		const createResult = await nextpress.posts.create({
			title: "Secure",
			blogId: mockIds.blogId,
		});
		expect(createResult.isErr).toBe(false);

		expect(calls).toHaveLength(1);
		expect(calls[0]?.url).not.toContain(SECRET_KEY);
	});

	it("prevents caller-supplied Authorization header from overriding the api key", async () => {
		const { fetchMock, calls } = createMockFetch([
			{
				path: "/api/health",
				handler: (request) => {
					expect(request.headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
					return Response.json({ status: "ok", timestamp: "now" });
				},
			},
		]);

		const http = createHttpClient({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			fetch: fetchMock,
			timeout: 5000,
		});

		await http.request("/api/health", {
			headers: { Authorization: "Bearer attacker_key" },
		});
		expect(calls[0]?.headers.authorization).toBe(`Bearer ${SECRET_KEY}`);
	});

	it("URL-encodes slug path segments to avoid path traversal in public routes", async () => {
		const { fetchMock, calls } = createMockFetch([
			{
				path: /^\/api\/public\/page\/.+$/,
				handler: () =>
					Response.json({
						id: mockIds.pageId,
						title: "Safe",
						slug: "../../../etc/passwd",
						status: "publish",
						siteId: mockIds.siteId,
					}),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		await nextpress.public.page({ slug: "../../../etc/passwd" });
		const calledPath = new URL(calls[0]?.url ?? "").pathname;
		expect(calledPath).toBe("/api/public/page/..%2F..%2F..%2Fetc%2Fpasswd");
		expect(calledPath).not.toContain("/etc/passwd");
	});

	it("rejects javascript: URLs in block media content before upload", async () => {
		const fetchMock = vi.fn();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock as typeof fetch,
		});

		await expect(
			nextpress.pages.create({
				title: "XSS attempt",
				blocks: [
					nextpress.blocks.image({
						url: "javascript:alert(1)",
						alt: "bad",
					}),
				],
			}),
		).rejects.toThrow(/Invalid pages.create input|Media URL must be http/);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("rejects empty option names before network call", async () => {
		const fetchMock = vi.fn();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock as typeof fetch,
		});

		await expect(nextpress.options.set({ name: "", value: "x" })).rejects.toThrow(
			"Invalid options.set input",
		);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("does not include apiKey in NextpressError messages", async () => {
		const { fetchMock } = createMockFetch([
			{
				path: "/api/health",
				handler: () =>
					Response.json({ message: "Invalid key", code: "AUTH_INVALID" }, { status: 401 }),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		try {
			await nextpress.health.check();
			expect.unreachable("should throw");
		} catch (error) {
			expect(String(error)).not.toContain(SECRET_KEY);
		}
	});

	it("validates setup credentials locally before sending to server", async () => {
		const fetchMock = vi.fn();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock as typeof fetch,
		});

		await expect(
			nextpress.health.setup({
				email: "not-an-email",
				password: "short",
				siteName: "",
				domain: "",
			}),
		).rejects.toThrow("Invalid health.setup input");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("surfaces API_KEY_SCOPE_DENIED from 403 responses", async () => {
		const { fetchMock } = createMockFetch([
			{
				method: "POST",
				path: "/api/pages",
				handler: () =>
					Response.json(
						{
							message: "This API key does not have permission for this action",
							code: "API_KEY_SCOPE_DENIED",
							requiredScopes: ["pages:write"],
						},
						{ status: 403 },
					),
			},
		]);

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: SECRET_KEY,
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		const createResult = await nextpress.pages.create({ title: "Blocked", blocks: [] });
		expect(createResult.isErr).toBe(true);
		if (createResult.isErr) {
			expect(createResult.error).toMatchObject({
				status: 403,
				code: "API_KEY_SCOPE_DENIED",
			});
			expect(String(createResult.error)).not.toContain(SECRET_KEY);
		}
	});
});
