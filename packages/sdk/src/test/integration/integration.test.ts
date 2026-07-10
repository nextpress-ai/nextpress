import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
	createIntegrationClient,
	type IntegrationClientContext,
} from "./bootstrap-integration-client.js";
import { loadIntegrationTestConfig } from "./config.js";
import { VERSION_STALE } from "../../client/sdk-result.js";

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
			await ctx.client.posts.delete({ id: createdPostId });
		}
		if (createdPageId) {
			await ctx.client.pages.delete({ id: createdPageId });
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

		const createdResult = await ctx.client.posts.create({
			title: `SDK Integration Post ${runId}`,
			blogId: blog.id,
			status: "draft",
			blocks: [ctx.client.blocks.paragraph({ text: "Integration test body" })],
		});
		expect(createdResult.isErr).toBe(false);
		if (createdResult.isErr) return;
		const created = createdResult.value;
		createdPostId = created.id;
		expect(created.title).toContain("SDK Integration Post");

		const fetched = await ctx.client.posts.get({ id: created.id });
		expect(fetched.id).toBe(created.id);

		const updatedResult = await ctx.client.posts.update({
			id: created.id,
			expectedVersion: created.version ?? 0,
			title: `SDK Integration Post Updated ${runId}`,
			status: "draft",
		});
		expect(updatedResult.isErr).toBe(false);
		if (!updatedResult.isErr) {
			expect(updatedResult.value.title).toContain("Updated");
		}

		const list = await ctx.client.posts.list({ status: "any", per_page: 50 });
		expect(list.posts.some((post) => post.id === created.id)).toBe(true);
	});

	it("creates a page with blocks and updates the block tree", async () => {
		const createResult = await ctx.client.pages.create({
			title: `SDK Integration Page ${runId}`,
			slug: `sdk-int-page-${runId}`,
			status: "draft",
			blocks: [
				ctx.client.blocks.heading({ text: "Integration", level: 1 }),
				ctx.client.blocks.paragraph({ text: "Built via dist SDK" }),
			],
		});
		expect(createResult.isErr).toBe(false);
		if (createResult.isErr) return;
		const page = createResult.value;
		createdPageId = page.id;
		expect(page.title).toContain("SDK Integration Page");

		const updatedResult = await ctx.client.pages.update({
			id: page.id,
			expectedVersion: page.version ?? 0,
			blocks: [
				ctx.client.blocks.heading({ text: "Updated", level: 2 }),
				ctx.client.blocks.container({
					children: [ctx.client.blocks.paragraph({ text: "Nested block" })],
				}),
			],
		});
		expect(updatedResult.isErr).toBe(false);
		if (!updatedResult.isErr) {
			expect(Array.isArray(updatedResult.value.blocks)).toBe(true);
			expect((updatedResult.value.blocks as unknown[]).length).toBe(2);
		}

		const bySlug = await ctx.client.pages.get({ id: page.slug });
		expect(bySlug.id).toBe(page.id);
	});

	it("rejects stale page updates with VERSION_STALE", async () => {
		if (!createdPageId) {
			throw new Error("Missing createdPageId");
		}
		const current = await ctx.client.pages.get({ id: createdPageId });
		const stale = await ctx.client.pages.update({
			id: createdPageId,
			expectedVersion: 0,
			blocks: current.blocks ?? [],
		});
		expect(stale.isErr).toBe(true);
		if (stale.isErr) {
			expect(stale.error.code).toBe(VERSION_STALE);
		}
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

		const current = await ctx.client.pages.get({ id: createdPageId });
		const updateResult = await ctx.client.pages.update({
			id: createdPageId,
			expectedVersion: current.version ?? 0,
			blocks: ctx.client.blocks.starterLayout(),
		});
		expect(updateResult.isErr).toBe(false);

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
		const saveResult = await editor.save();
		expect(saveResult.isErr).toBe(false);
	});
});
