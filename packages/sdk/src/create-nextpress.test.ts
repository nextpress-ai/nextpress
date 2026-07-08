import { describe, expect, it, vi } from "vitest";
import { createNextpress } from "./create-nextpress.js";

const SITE_ID = "00000000-0000-4000-8000-000000000001";
const BLOG_ID = "00000000-0000-4000-8000-000000000002";

describe("createNextpress", () => {
	it("validates options and wires resources", async () => {
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			if (init?.method === "POST") {
				return Response.json(
					{ id: "page-1", title: "Hello", slug: "hello", status: "draft", siteId: SITE_ID },
					{ status: 201 },
				);
			}
			return Response.json({ status: "ok", timestamp: new Date().toISOString() });
		});

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test_key",
			siteId: SITE_ID,
			fetch: fetchMock as typeof fetch,
		});

		expect(nextpress.config.baseUrl).toBe("https://cms.example.com");
		expect(nextpress.posts).toBeDefined();
		expect(nextpress.blocks.heading).toBeTypeOf("function");

		await nextpress.health.check();

		const page = await nextpress.pages.create({
			title: "Hello",
			blocks: [nextpress.blocks.heading({ text: "Welcome", level: 1 })],
		});

		expect(page.title).toBe("Hello");

		const createCall = fetchMock.mock.calls.find(
			([, init]) => (init as RequestInit)?.method === "POST",
		);
		expect(createCall).toBeTruthy();
		const body = JSON.parse((createCall?.[1] as RequestInit).body as string);
		expect(body.blocks).toHaveLength(1);
		expect(body.blocks[0].name).toBe("core/heading");
	});

	it("rejects invalid options", () => {
		expect(() =>
			createNextpress({
				baseUrl: "not-a-url",
				apiKey: "",
				siteId: SITE_ID,
			}),
		).toThrow("Invalid createNextpress options");
	});

	it("requires siteId", () => {
		expect(() =>
			createNextpress({
				baseUrl: "https://cms.example.com",
				apiKey: "np_test_key",
			} as Parameters<typeof createNextpress>[0]),
		).toThrow("Invalid createNextpress options");
	});

	it("validates post create input", async () => {
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test_key",
			siteId: SITE_ID,
			fetch: vi.fn() as typeof fetch,
		});

		await expect(nextpress.posts.create({ title: "Missing blog" })).rejects.toThrow(
			"Invalid posts.create input",
		);
	});

	it("accepts valid post create input shape", () => {
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test_key",
			siteId: SITE_ID,
			fetch: vi.fn(async () => Response.json({ id: "post-1" }, { status: 201 })) as typeof fetch,
		});

		expect(() =>
			nextpress.posts.create({
				title: "Test Post",
				blogId: BLOG_ID,
			}),
		).not.toThrow();
	});

	it("emits post-saved when a post is created", async () => {
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			if (init?.method === "POST") {
				return Response.json(
					{
						id: "post-1",
						title: "Hello",
						slug: "hello",
						status: "draft",
						blogId: BLOG_ID,
						authorId: "user-1",
					},
					{ status: 201 },
				);
			}
			return Response.json({ status: "ok", timestamp: new Date().toISOString() });
		});

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test_key",
			siteId: SITE_ID,
			fetch: fetchMock as typeof fetch,
		});

		const handler = vi.fn();
		nextpress.on("post-saved", handler);

		await nextpress.posts.create({
			title: "Hello",
			blogId: BLOG_ID,
		});

		expect(handler).toHaveBeenCalledOnce();
		expect(handler.mock.calls[0][0].action).toBe("created");
		expect(handler.mock.calls[0][0].post.id).toBe("post-1");
		expect(handler.mock.calls[0][0].post.set).toBeTypeOf("function");
	});

	it("propagates handler mutations back to the resource return value", async () => {
		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			if (init?.method === "POST") {
				return Response.json(
					{
						id: "post-1",
						title: "Hello",
						slug: "hello",
						status: "draft",
						blogId: BLOG_ID,
						authorId: "user-1",
					},
					{ status: 201 },
				);
			}
			return Response.json({ status: "ok", timestamp: new Date().toISOString() });
		});

		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_test_key",
			siteId: SITE_ID,
			fetch: fetchMock as typeof fetch,
		});

		nextpress.on("post-saved", ({ post }) => {
			post.set((current) => ({ title: `${current.title} [reviewed]` }));
		});

		const post = await nextpress.posts.create({
			title: "Hello",
			blogId: BLOG_ID,
		});

		expect(post.title).toBe("Hello [reviewed]");
	});
});
