import { describe, expect, it } from "vitest";
import { createNextpress } from "../create-nextpress.js";
import { createDefaultMockApi, mockIds } from "./mock-fetch.js";

describe("integration", () => {
	it("runs a full posts CRUD lifecycle against a mock API", async () => {
		const { fetchMock } = createDefaultMockApi();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_integration_key",
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		const created = await nextpress.posts.create({
			title: "Integration Post",
			blogId: mockIds.blogId,
			status: "draft",
		});
		expect(created.title).toBe("Integration Post");

		const fetched = await nextpress.posts.get({ id: mockIds.postId });
		expect(fetched.id).toBe(mockIds.postId);

		const updated = await nextpress.posts.update({
			id: mockIds.postId,
			title: "Updated Post",
			status: "publish",
		});
		expect(updated.title).toBe("Updated Post");

		const list = await nextpress.posts.list({ status: "any" });
		expect(list.posts).toHaveLength(1);

		const deleted = await nextpress.posts.delete({ id: mockIds.postId });
		expect(deleted.message).toContain("deleted");
	});

	it("creates a page with blocks and updates the block tree", async () => {
		const { fetchMock } = createDefaultMockApi();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_integration_key",
			fetch: fetchMock,
		});

		const page = await nextpress.pages.create({
			title: "Landing",
			blocks: [
				nextpress.blocks.heading({ text: "Welcome", level: 1 }),
				nextpress.blocks.paragraph({ text: "Intro copy" }),
			],
		});
		expect(page.title).toBe("Landing");

		const updated = await nextpress.pages.update({
			id: mockIds.pageId,
			blocks: [
				nextpress.blocks.heading({ text: "Updated", level: 2 }),
				nextpress.blocks.container({
					children: [nextpress.blocks.paragraph({ text: "Nested" })],
				}),
			],
		});
		expect(Array.isArray(updated.blocks)).toBe(true);
		expect((updated.blocks as unknown[]).length).toBe(2);
	});

	it("uploads media via multipart form data", async () => {
		const { fetchMock, calls } = createDefaultMockApi();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_integration_key",
			fetch: fetchMock,
		});

		const file = new Blob(["fake-image"], { type: "image/png" });
		const media = await nextpress.media.upload({
			file,
			alt: "Hero",
			siteId: mockIds.siteId,
		});

		expect(media.url).toContain("/uploads/");
		const uploadCall = calls.find(
			(call) => call.method === "POST" && call.url.includes("/api/media"),
		);
		expect(uploadCall?.body).toBeInstanceOf(FormData);
		expect(uploadCall?.headers["content-type"]).toBeUndefined();
	});

	it("propagates default siteId on list requests", async () => {
		const { fetchMock, calls } = createDefaultMockApi();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_integration_key",
			siteId: mockIds.siteId,
			fetch: fetchMock,
		});

		await nextpress.posts.list({ status: "publish" });
		const listCall = calls.find((call) => call.url.includes("/api/posts"));
		expect(listCall?.url).toContain(`siteId=${mockIds.siteId}`);
	});

	it("fetches public homepage and authenticated user profile", async () => {
		const { fetchMock } = createDefaultMockApi();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_integration_key",
			fetch: fetchMock,
		});

		const homepage = await nextpress.public.homepage();
		expect(homepage.slug).toBe("home");

		const user = await nextpress.auth.me();
		expect(user.email).toBe("admin@example.com");
	});

	it("resolves pages by slug through the pages.get resource", async () => {
		const { fetchMock } = createDefaultMockApi();
		const nextpress = createNextpress({
			baseUrl: "https://cms.example.com",
			apiKey: "np_integration_key",
			fetch: fetchMock,
		});

		await nextpress.pages.create({ title: "About", slug: "about-us" });
		const page = await nextpress.pages.get({ id: "about-us" });
		expect(page.slug).toBe("about-us");
	});
});
