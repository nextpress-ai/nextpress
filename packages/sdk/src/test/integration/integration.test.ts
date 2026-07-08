import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	createIntegrationClient,
	type IntegrationClientContext,
} from "./bootstrap-integration-client.js";
import { loadIntegrationTestConfig } from "./config.js";

const integrationConfig = await loadIntegrationTestConfig();
const integration = integrationConfig ? describe : describe.skip;

integration("integration @nextpress-org/sdk dist + real API key", () => {
	let ctx: IntegrationClientContext;
	let createdPostId: string | undefined;
	let createdPageId: string | undefined;
	let createdBlogId: string | undefined;
	const runId = Date.now().toString(36);

	beforeAll(async () => {
		if (!integrationConfig) {
			throw new Error("integration.config.ts missing or enabled: false");
		}
		ctx = await createIntegrationClient({ config: integrationConfig });
	}, 120_000);

	afterAll(async () => {
		if (createdPostId) {
			await ctx.client.posts.delete({ id: createdPostId }).catch(() => undefined);
		}
		if (createdPageId) {
			await ctx.client.pages.delete({ id: createdPageId }).catch(() => undefined);
		}
		if (createdBlogId) {
			await ctx.client.blogs.delete({ id: createdBlogId }).catch(() => undefined);
		}
	});

	it("uses the shipped dist bundle (not src imports)", () => {
		expect(ctx.sdk.createNextpress).toBeTypeOf("function");
		expect(ctx.sdkModulePath).toContain(`${path.sep}dist${path.sep}`);
		expect(ctx.client.config.baseUrl).toBe(integrationConfig?.baseUrl);
		expect(ctx.client.config).not.toHaveProperty("apiKey");
	});

	it("health endpoint responds", async () => {
		const health = await ctx.client.health.check();
		expect(health.status).toBe("ok");
		expect(health.timestamp).toBeTruthy();
	});

	it("authenticates with the provided API key", async () => {
		const user = await ctx.client.auth.me();
		expect(user.email).toContain("@");
		expect(user.username).toBeTruthy();
	});

	it("runs posts CRUD against the live API", async () => {
		const blog = await ctx.client.blogs.create({
			name: `SDK Integration Blog ${runId}`,
			slug: `sdk-int-blog-${runId}`,
		});
		createdBlogId = blog.id;

		const created = await ctx.client.posts.create({
			title: `SDK Integration Post ${runId}`,
			blogId: blog.id,
			status: "draft",
			blocks: [ctx.client.blocks.paragraph({ text: "Integration test body" })],
		});
		createdPostId = created.id;
		expect(created.title).toContain("SDK Integration Post");

		const fetched = await ctx.client.posts.get({ id: created.id });
		expect(fetched.id).toBe(created.id);

		const updated = await ctx.client.posts.update({
			id: created.id,
			title: `SDK Integration Post Updated ${runId}`,
			status: "draft",
		});
		expect(updated.title).toContain("Updated");

		const list = await ctx.client.posts.list({ status: "any", per_page: 50 });
		expect(list.posts.some((post) => post.id === created.id)).toBe(true);
	});

	it("creates a page with blocks and updates the block tree", async () => {
		const page = await ctx.client.pages.create({
			title: `SDK Integration Page ${runId}`,
			slug: `sdk-int-page-${runId}`,
			status: "draft",
			blocks: [
				ctx.client.blocks.heading({ text: "Integration", level: 1 }),
				ctx.client.blocks.paragraph({ text: "Built via dist SDK" }),
			],
		});
		createdPageId = page.id;
		expect(page.title).toContain("SDK Integration Page");

		const updated = await ctx.client.pages.update({
			id: page.id,
			blocks: [
				ctx.client.blocks.heading({ text: "Updated", level: 2 }),
				ctx.client.blocks.container({
					children: [ctx.client.blocks.paragraph({ text: "Nested block" })],
				}),
			],
		});
		expect(Array.isArray(updated.blocks)).toBe(true);
		expect((updated.blocks as unknown[]).length).toBe(2);

		const bySlug = await ctx.client.pages.get({ id: page.slug });
		expect(bySlug.id).toBe(page.id);
	});

	it("returns dashboard stats for the scoped site", async () => {
		const stats = await ctx.client.dashboard.stats();
		expect(stats.siteId).toBeTruthy();
		expect(stats.users).toBeGreaterThanOrEqual(1);
	});

	it("exercises editor session preview on the live API", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId from prior test");
		}

		await ctx.client.pages.update({
			id: createdPageId,
			blocks: ctx.client.blocks.starterLayout(),
		});

		const preview = await ctx.client.preview.page({ id: createdPageId });
		expect(preview.id).toBe(createdPageId);
	});

	it("exercises editor session save on the live API", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId from prior test");
		}

		const editor = ctx.client.createEditorSession();
		await editor.load({ type: "page", id: createdPageId });
		editor.setBlocks([
			...editor.getBlocks(),
			ctx.client.blocks.paragraph({ text: "Editor session append" }),
		]);
		expect(editor.canUndo()).toBe(true);
		await editor.save();
	});
});
