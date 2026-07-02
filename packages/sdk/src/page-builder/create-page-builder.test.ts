import { describe, expect, it, vi } from "vitest";
import type { BlockConfig, Page, Template } from "../types/domain.js";
import { createPageBuilder } from "./create-page-builder.js";

describe("createPageBuilder", () => {
	const blocks = {
		heading: ({ text, level }: { text: string; level: number }) =>
			({
				id: "h1",
				name: "core/heading",
				type: "block",
				parentId: null,
				content: { kind: "text", value: text, level },
			}) as BlockConfig,
		paragraph: ({ text }: { text: string }) =>
			({
				id: "p1",
				name: "core/paragraph",
				type: "block",
				parentId: null,
				content: { kind: "text", value: text },
			}) as BlockConfig,
	};

	const pages = {
		get: vi.fn(
			async () =>
				({
					id: "page-1",
					title: "Page",
					slug: "page",
					status: "draft",
					siteId: "s1",
					blocks: [],
				}) as Page,
		),
		create: vi.fn(
			async (input: { title: string; blocks?: BlockConfig[] }) =>
				({ id: "page-2", siteId: "s1", status: "draft", slug: "new", ...input }) as Page,
		),
		update: vi.fn(
			async ({ id, ...input }: { id: string; status?: string; blocks?: BlockConfig[] }) =>
				({
					id,
					siteId: "s1",
					title: "Page",
					slug: "page",
					status: input.status ?? "draft",
					blocks: input.blocks ?? [],
				}) as Page,
		),
	};

	const templates = {
		get: vi.fn(
			async () =>
				({
					id: "tpl-1",
					name: "Hero",
					type: "page",
					blocks: [
						{
							id: "b1",
							name: "core/html",
							type: "block",
							parentId: null,
							content: { kind: "empty" },
						},
					],
				}) as Template,
		),
	};

	const posts = { get: vi.fn(), update: vi.fn() };
	const preview = { page: vi.fn(), post: vi.fn() };

	const pageBuilder = createPageBuilder({
		pages: pages as never,
		posts: posts as never,
		templates: templates as never,
		preview: preview as never,
		blocks: blocks as never,
	});

	it("publishes a page via status update", async () => {
		const page = await pageBuilder.publishPage({ id: "page-1" });
		expect(page.status).toBe("publish");
		expect(pages.update).toHaveBeenCalledWith(
			expect.objectContaining({ id: "page-1", status: "publish", publishedAt: expect.any(String) }),
		);
	});

	it("creates a page from a template block tree", async () => {
		const page = await pageBuilder.createPageFromTemplate({
			templateId: "tpl-1",
			title: "Landing",
		});
		expect(page.title).toBe("Landing");
		expect(page.blocks).toHaveLength(1);
	});

	it("applies a template in append mode", async () => {
		const page = await pageBuilder.applyTemplateToPage({
			pageId: "page-1",
			templateId: "tpl-1",
			mode: "append",
		});
		expect(page.blocks).toHaveLength(1);
	});
});
