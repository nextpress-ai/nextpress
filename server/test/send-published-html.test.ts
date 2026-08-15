import { describe, expect, it } from "vitest";
import type { Response } from "express";
import { sendPublishedHtml } from "../lib/send-published-html";

const commentsBlock = {
	id: "c",
	name: "post/comments",
	type: "block" as const,
	parentId: null,
	content: { kind: "structured" as const, data: { showForm: true, showCount: true } },
};

function captureResponse(): Response & { body: string } {
	let body = "";
	const res = {
		setHeader: () => res,
		send: (html: string) => {
			body = html;
			return res;
		},
		get body() {
			return body;
		},
	};
	return res as unknown as Response & { body: string };
}

describe("sendPublishedHtml", () => {
	it("binds comments on a page document so placeholders never leak", async () => {
		const res = captureResponse();
		await sendPublishedHtml({
			res,
			models: {
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
			},
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
	});
});
