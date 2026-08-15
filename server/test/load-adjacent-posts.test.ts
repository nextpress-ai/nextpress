import { describe, expect, it } from "vitest";
import { loadAdjacentPosts } from "../lib/load-adjacent-posts";

describe("loadAdjacentPosts", () => {
	it("returns prev and next published siblings by createdAt", async () => {
		const adjacent = await loadAdjacentPosts({
			post: {
				id: "b",
				title: "B",
				slug: "b",
				blogId: "blog-1",
				status: "publish",
			},
			findSiblings: async () => [
				{ id: "a", title: "A", slug: "a", blogId: "blog-1", status: "publish" },
				{ id: "b", title: "B", slug: "b", blogId: "blog-1", status: "publish" },
				{ id: "c", title: "C", slug: "c", blogId: "blog-1", status: "publish" },
			],
		});
		expect(adjacent.prev?.slug).toBe("a");
		expect(adjacent.next?.slug).toBe("c");
	});
});
