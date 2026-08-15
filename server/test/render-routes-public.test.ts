import { AddressInfo } from "node:net";
import { createServer } from "node:http";
import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import type { Deps } from "../routes/shared/deps";
import { createRenderRoutes } from "../routes/render.routes";

const SITE = {
	id: "550e8400-e29b-41d4-a716-446655440000",
	name: "Test",
	siteUrl: "http://localhost:5000",
};
const BLOG_ID = "550e8400-e29b-41d4-a716-446655440001";
const POST_ID = "550e8400-e29b-41d4-a716-446655440002";
const PAGE_ID = "550e8400-e29b-41d4-a716-446655440003";

const commentsBlock = {
	id: "c",
	name: "post/comments",
	type: "block" as const,
	parentId: null,
	content: { kind: "structured" as const, data: { showForm: true } },
};

const headingBlock = (text: string) => ({
	id: "h",
	name: "core/heading",
	type: "block" as const,
	parentId: null,
	content: { kind: "text" as const, value: text, level: 1 },
});

function createModels({
	page,
	post,
}: {
	page?: Record<string, unknown> | null;
	post?: Record<string, unknown> | null;
}): Deps["models"] {
	return {
		sites: {
			findById: async () => SITE,
			findByHostname: async () => SITE,
			findDefaultSite: async () => SITE,
			findMany: async () => [SITE],
			getSettings: async () => ({
				general: {
					siteName: "Test",
					siteDescription: "",
					siteUrl: "http://localhost:5000",
				},
			}),
		},
		pages: {
			findById: async () => page ?? undefined,
			findBySiteAndSlug: async () => page ?? undefined,
		},
		posts: {
			findById: async () => post ?? undefined,
			findManyWhere: async () => [],
		},
		blogs: {
			findManyWhere: async () => [{ id: BLOG_ID, siteId: SITE.id }],
		},
		comments: {
			findManyWhere: async () => [
				{
					id: "a",
					parentId: null,
					authorName: "Ada",
					content: "Hi from SSR",
					status: "approved",
				},
			],
		},
		users: { findById: async () => null },
		options: { getOption: async () => undefined },
	} as unknown as Deps["models"];
}

const servers: Array<ReturnType<typeof createServer>> = [];

async function requestPath({
	models,
	path,
}: {
	models: Deps["models"];
	path: string;
}): Promise<{ status: number; body: string; contentType: string }> {
	const app = express();
	app.use(createRenderRoutes({ models } as Deps));
	const server = createServer(app);
	servers.push(server);
	await new Promise<void>((resolve) => {
		server.listen(0, "127.0.0.1", () => resolve());
	});
	const { port } = server.address() as AddressInfo;
	const response = await fetch(`http://127.0.0.1:${port}${path}`);
	return {
		status: response.status,
		body: await response.text(),
		contentType: response.headers.get("content-type") ?? "",
	};
}

afterEach(async () => {
	await Promise.all(
		servers.splice(0).map(
			(server) =>
				new Promise<void>((resolve, reject) => {
					server.close((error) => (error ? reject(error) : resolve()));
				}),
		),
	);
});

describe("public HTML routes refuse unpublished documents", () => {
	it("returns 404 HTML for a draft post", async () => {
		const result = await requestPath({
			models: createModels({
				post: {
					id: POST_ID,
					title: "Draft Secret",
					status: "draft",
					blogId: BLOG_ID,
					blocks: [headingBlock("Draft Secret")],
				},
			}),
			path: `/posts/${POST_ID}`,
		});
		expect(result.status).toBe(404);
		expect(result.body).toContain("Page not found");
		expect(result.body).not.toContain("Draft Secret");
	});

	it("returns 404 HTML for a passworded published post", async () => {
		const result = await requestPath({
			models: createModels({
				post: {
					id: POST_ID,
					title: "Locked Post",
					status: "publish",
					password: "secret",
					blogId: BLOG_ID,
					blocks: [headingBlock("Locked Post")],
				},
			}),
			path: `/posts/${POST_ID}`,
		});
		expect(result.status).toBe(404);
		expect(result.body).not.toContain("Locked Post");
	});

	it("returns 404 HTML for a draft page", async () => {
		const result = await requestPath({
			models: createModels({
				page: {
					id: PAGE_ID,
					title: "Draft Page",
					status: "draft",
					siteId: SITE.id,
					blocks: [headingBlock("Draft Page")],
				},
			}),
			path: `/pages/${PAGE_ID}`,
		});
		expect(result.status).toBe(404);
		expect(result.body).not.toContain("Draft Page");
	});

	it("returns JSON 404 for an unpublished site page slug", async () => {
		const result = await requestPath({
			models: createModels({
				page: {
					id: PAGE_ID,
					title: "Private About",
					status: "private",
					siteId: SITE.id,
					slug: "about",
					blocks: [headingBlock("Private About")],
				},
			}),
			path: `/sites/${SITE.id}/about`,
		});
		expect(result.status).toBe(404);
		expect(result.contentType).toContain("application/json");
		expect(result.body).toContain("Page not found");
		expect(result.body).not.toContain("Private About");
	});
});

describe("public HTML routes bind post blocks", () => {
	it("binds comments when /pages/:id is a published page", async () => {
		const result = await requestPath({
			models: createModels({
				page: {
					id: PAGE_ID,
					title: "About",
					status: "publish",
					siteId: SITE.id,
					blocks: [commentsBlock],
					other: { seo: {}, design: {} },
				},
			}),
			path: `/pages/${PAGE_ID}`,
		});
		expect(result.status).toBe(200);
		expect(result.body).toContain("Ada");
		expect(result.body).toContain("Hi from SSR");
		expect(result.body).not.toContain("Jane Doe");
	});

	it("falls back to a published post when /pages/:id is not a site page", async () => {
		const result = await requestPath({
			models: createModels({
				post: {
					id: POST_ID,
					title: "First Post",
					status: "publish",
					blogId: BLOG_ID,
					blocks: [commentsBlock],
					other: { seo: {}, design: {} },
				},
			}),
			path: `/pages/${POST_ID}`,
		});
		expect(result.status).toBe(200);
		expect(result.body).toContain("Ada");
		expect(result.body).not.toContain("Jane Doe");
	});
});
