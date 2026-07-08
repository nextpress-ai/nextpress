import { describe, expect, it, vi } from "vitest";
import { resolveRequestEvents } from "./resolve-request-events.js";

describe("resolveRequestEvents", () => {
	it("maps post create to post-saved and post-created", () => {
		const post = {
			id: "post-1",
			title: "Hello",
			slug: "hello",
			status: "draft",
			blogId: "blog-1",
			authorId: "user-1",
		};

		const events = resolveRequestEvents({
			method: "POST",
			path: "/api/posts",
			body: { title: "Hello", blogId: "blog-1" },
			result: post,
		});

		expect(events.map((entry) => entry.event)).toEqual(["post-saved", "post-created"]);
	});

	it("maps post update with publish status to post-saved and post-published", () => {
		const post = {
			id: "post-1",
			title: "Hello",
			slug: "hello",
			status: "publish",
			blogId: "blog-1",
			authorId: "user-1",
		};

		const events = resolveRequestEvents({
			method: "PUT",
			path: "/api/posts/post-1",
			body: { status: "publish" },
			result: post,
		});

		expect(events.map((entry) => entry.event)).toEqual([
			"post-saved",
			"post-updated",
			"post-published",
		]);
	});

	it("maps page restore to page-version-restored", () => {
		const page = {
			id: "page-1",
			title: "About",
			slug: "about",
			status: "draft",
			siteId: "site-1",
		};

		const events = resolveRequestEvents({
			method: "POST",
			path: "/api/pages/page-1/restore",
			body: { version: 3 },
			result: page,
		});

		expect(events).toEqual([{ event: "page-version-restored", payload: { page, version: 3 } }]);
	});
});
