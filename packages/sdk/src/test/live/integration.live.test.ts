import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NextpressClient } from "../../create-nextpress.js";
import { createLiveClient } from "./bootstrap-live-client.js";
import { isLiveTestEnabled } from "./live-config.js";

const live = isLiveTestEnabled() ? describe : describe.skip;

live("live integration @nextpress dev server", () => {
	let client: NextpressClient;
	let createdPostId: string | undefined;
	let createdPageId: string | undefined;
	let createdBlogId: string | undefined;
	const runId = Date.now().toString(36);

	beforeAll(async () => {
		const liveContext = await createLiveClient();
		client = liveContext.client;
	}, 120_000);

	afterAll(async () => {
		if (createdPostId) {
			await client.posts.delete({ id: createdPostId }).catch(() => undefined);
		}
		if (createdPageId) {
			await client.pages.delete({ id: createdPageId }).catch(() => undefined);
		}
		if (createdBlogId) {
			await client.blogs.delete({ id: createdBlogId }).catch(() => undefined);
		}
	});

	it("health endpoint responds on the running server", async () => {
		const health = await client.health.check();
		expect(health.status).toBe("ok");
		expect(health.timestamp).toBeTruthy();
	});

	it("returns the authenticated admin user", async () => {
		const user = await client.auth.me();
		expect(user.email).toContain("@");
		expect(user.username).toBeTruthy();
	});

	it("lists sites for the authenticated session", async () => {
		const { sites, total } = await client.sites.list();
		expect(total).toBeGreaterThan(0);
		expect(sites[0]?.id).toBeTruthy();
	});

	it("creates a blog, post, and page with blocks then reads them back", async () => {
		const blog = await client.blogs.create({
			name: `SDK Live Blog ${runId}`,
			slug: `sdk-live-blog-${runId}`,
		});
		createdBlogId = blog.id;
		expect(blog.slug).toContain("sdk-live-blog");

		const post = await client.posts.create({
			title: `SDK Live Post ${runId}`,
			blogId: blog.id,
			status: "draft",
			blocks: [client.blocks.paragraph({ text: "Live integration post body" })],
		});
		createdPostId = post.id;

		const fetchedPost = await client.posts.get({ id: post.id });
		expect(fetchedPost.title).toBe(post.title);

		const page = await client.pages.create({
			title: `SDK Live Page ${runId}`,
			slug: `sdk-live-page-${runId}`,
			status: "draft",
			blocks: [
				client.blocks.heading({ text: "Live SDK Page", level: 1 }),
				client.blocks.paragraph({ text: "Created via @nextpress-org/sdk against dev server." }),
			],
		});
		createdPageId = page.id;

		const fetchedPage = await client.pages.get({ id: page.slug });
		expect(fetchedPage.id).toBe(page.id);
		expect(Array.isArray(fetchedPage.blocks)).toBe(true);
	});

	it("updates page blocks and persists the new tree", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId from prior test");
		}

		const updated = await client.pages.update({
			id: createdPageId,
			blocks: [
				client.blocks.heading({ text: "Updated Live Page", level: 2 }),
				client.blocks.image({
					url: "https://example.com/test-image.png",
					alt: "Test",
				}),
			],
		});

		expect(Array.isArray(updated.blocks)).toBe(true);
		expect((updated.blocks as unknown[]).length).toBeGreaterThan(0);
	});

	it("returns dashboard stats for the scoped site", async () => {
		const stats = await client.dashboard.stats();
		expect(stats.siteId).toBeTruthy();
		expect(stats.users).toBeGreaterThanOrEqual(1);
	});

	it("lists pages including the one created in this run", async () => {
		const result = await client.pages.list({ status: "any", per_page: 50 });
		const match = result.pages.find((page) => page.id === createdPageId);
		expect(match?.title).toContain("SDK Live Page");
	});
});
