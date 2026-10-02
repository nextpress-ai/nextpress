import { describe, expect, it } from "vitest";
import type { Response } from "express";
import type { Deps } from "../routes/shared/deps";
import { sendPublishedHtml } from "../lib/send-published-html";
import { publishedPageCache } from "../lib/published-page-cache";

const commentsBlock = {
	id: "c",
	name: "post/comments",
	type: "block" as const,
	parentId: null,
	content: { kind: "structured" as const, data: { showForm: true, showCount: true } },
};

function captureResponse(): Response & { body: string; headers: Record<string, string> } {
	let body = "";
	const headers: Record<string, string> = {};
	const res = {
		setHeader: (name: string, value: string) => {
			headers[name] = value;
			return res;
		},
		send: (html: string) => {
			body = html;
			return res;
		},
		get body() {
			return body;
		},
		get headers() {
			return headers;
		},
	};
	return res as unknown as Response & { body: string; headers: Record<string, string> };
}

describe("sendPublishedHtml", () => {
	it("binds comments on a page document so placeholders never leak", async () => {
		const res = captureResponse();
		const models = {
			users: { findById: async () => null },
			comments: {
				findManyWhere: async () => [
					{
						id: "a",
						parentId: null,
						authorName: "Ada",
						content: "Hi from the page",
						status: "approved",
					},
					{
						id: "b",
						parentId: "a",
						authorName: "Bob",
						content: "Reply on the page",
						status: "approved",
					},
				],
			},
			posts: { findManyWhere: async () => [] },
		} as unknown as Deps["models"];
		await sendPublishedHtml({
			res,
			models,
			document: {
				id: "page-1",
				title: "About",
				status: "publish",
				blocks: [commentsBlock],
				other: { seo: {}, design: {} },
			},
			canonicalUrl: "http://localhost:5000/pages/page-1",
		});

		expect(res.body).toContain("Ada");
		expect(res.body).toContain("Hi from the page");
		expect(res.body).toContain("Bob");
		expect(res.body).toContain("Reply on the page");
		expect(res.body).toContain("Comments (2)");
		expect(res.body).not.toContain("Jane Doe");
		expect(res.headers["X-Nextpress-Cache"]).toBe("skip");
	});

	it("returns the stored HTML when the page version has not changed", async () => {
		publishedPageCache.clear();
		const models = {
			users: { findById: async () => null },
			comments: { findManyWhere: async () => [] },
			posts: { findManyWhere: async () => [] },
			sites: { findById: async () => ({ id: "site-1" }) },
		} as unknown as Deps["models"];
		const document = {
			id: "page-cached",
			title: "Home",
			status: "publish",
			siteId: "site-1",
			version: 7,
			blocks: [
				{
					id: "h",
					name: "core/heading",
					type: "block" as const,
					parentId: null,
					content: { kind: "text" as const, value: "Cached heading", level: 1 },
				},
			],
			other: { seo: {}, design: {} },
		};
		const first = captureResponse();
		await sendPublishedHtml({
			res: first,
			models,
			document,
			canonicalUrl: "http://localhost:5000/home",
		});
		const second = captureResponse();
		await sendPublishedHtml({
			res: second,
			models,
			document: { ...document, title: "Changed without a version bump" },
			canonicalUrl: "http://localhost:5000/home",
		});
		expect(first.headers["X-Nextpress-Cache"]).toBe("miss");
		expect(second.headers["X-Nextpress-Cache"]).toBe("hit");
		expect(second.body).toContain("Cached heading");
		expect(second.body).not.toContain("Changed without a version bump");

		const rebuilt = captureResponse();
		await sendPublishedHtml({
			res: rebuilt,
			models,
			document: { ...document, version: 8, title: "Fresh" },
			canonicalUrl: "http://localhost:5000/home",
		});
		expect(rebuilt.headers["X-Nextpress-Cache"]).toBe("miss");
		expect(rebuilt.body).toContain("Fresh");
	});

	it("shares one saved copy when only the query string changes", async () => {
		publishedPageCache.clear();
		const models = {
			users: { findById: async () => null },
			comments: { findManyWhere: async () => [] },
			posts: { findManyWhere: async () => [] },
			sites: { findById: async () => ({ id: "site-1" }) },
		} as unknown as Deps["models"];
		const document = {
			id: "page-query",
			title: "Contact",
			status: "publish",
			siteId: "site-1",
			version: 2,
			blocks: [
				{
					id: "h",
					name: "core/heading",
					type: "block" as const,
					parentId: null,
					content: { kind: "text" as const, value: "Contact heading", level: 1 },
				},
			],
			other: { seo: {}, design: {} },
		};
		const first = captureResponse();
		await sendPublishedHtml({
			res: first,
			models,
			document,
			canonicalUrl: "http://localhost:5000/sites/site-1/contact?utm=one",
		});
		const second = captureResponse();
		await sendPublishedHtml({
			res: second,
			models,
			document: { ...document, title: "Should stay cached" },
			canonicalUrl: "http://localhost:5000/sites/site-1/contact?utm=two",
		});
		expect(first.headers["X-Nextpress-Cache"]).toBe("miss");
		expect(second.headers["X-Nextpress-Cache"]).toBe("hit");
		expect(second.body).toContain('href="http://localhost:5000/sites/site-1/contact"');
		expect(second.body).not.toContain("utm");
	});

	it("builds the author box and next link on every visit", async () => {
		publishedPageCache.clear();
		let authorName = "Ada Lovelace";
		let nextTitle = "First neighbor";
		const models = {
			users: { findById: async () => ({ id: "user-1", name: authorName }) },
			comments: { findManyWhere: async () => [] },
			posts: {
				findManyWhere: async () => [
					{
						id: "post-live",
						title: "Note",
						slug: "note",
						status: "publish",
						blogId: "blog-1",
						createdAt: "2026-01-01T00:00:00.000Z",
					},
					{
						id: "post-next",
						title: nextTitle,
						slug: "next",
						status: "publish",
						blogId: "blog-1",
						createdAt: "2026-02-01T00:00:00.000Z",
					},
				],
			},
			sites: { findById: async () => ({ id: "site-1" }) },
		} as unknown as Deps["models"];
		const document = {
			id: "post-live",
			title: "Note",
			slug: "note",
			status: "publish",
			siteId: "site-1",
			blogId: "blog-1",
			authorId: "user-1",
			version: 3,
			createdAt: "2026-01-01T00:00:00.000Z",
			blocks: [
				{
					id: "author",
					name: "post/author-box",
					type: "block" as const,
					parentId: null,
					content: { kind: "structured" as const, data: {} },
				},
				{
					id: "nav",
					name: "post/navigation",
					type: "block" as const,
					parentId: null,
					content: { kind: "structured" as const, data: { showLabel: true } },
				},
			],
			other: { seo: {}, design: {} },
		};
		const first = captureResponse();
		await sendPublishedHtml({
			res: first,
			models,
			document,
			canonicalUrl: "http://localhost:5000/posts/post-live",
		});
		authorName = "Grace Hopper";
		nextTitle = "Second neighbor";
		const second = captureResponse();
		await sendPublishedHtml({
			res: second,
			models,
			document,
			canonicalUrl: "http://localhost:5000/posts/post-live",
		});
		expect(first.headers["X-Nextpress-Cache"]).toBe("skip");
		expect(second.headers["X-Nextpress-Cache"]).toBe("skip");
		expect(first.body).toContain("Ada Lovelace");
		expect(first.body).toContain("First neighbor");
		expect(second.body).toContain("Grace Hopper");
		expect(second.body).toContain("Second neighbor");
		expect(second.body).not.toContain("Ada Lovelace");
	});
});
