import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapWpPost } from "./map-wp-post";
import type { ImportContext, WpPostRaw } from "./types";

const baseRaw: WpPostRaw = {
	id: 42,
	date: "2024-01-15T10:00:00",
	slug: "hello-world",
	status: "publish",
	link: "https://example.com/hello-world/",
	title: { rendered: "Hello World" },
	content: { rendered: "<p>Content here</p>" },
	excerpt: { rendered: "<p>Short excerpt</p>" },
	featured_media: 7,
	categories: [1],
	tags: [2],
};

const buildCtx = (overrides?: Partial<ImportContext>): ImportContext => ({
	baseUrl: "https://example.com",
	blogId: "blog-uuid",
	authorId: "author-uuid",
	featuredImageMode: "reference",
	categoryNames: new Map([[1, "News"]]),
	tagNames: new Map([[2, "update"]]),
	existingWpIds: new Set(),
	resolveFeaturedImage: vi.fn().mockResolvedValue("https://example.com/image.jpg"),
	...overrides,
});

describe("mapWpPost", () => {
	beforeEach(() => {
		vi.stubGlobal("crypto", { randomUUID: () => "block-uuid-1" });
	});

	it("maps WP fields to NextPress post shape", async () => {
		const mapped = await mapWpPost({ raw: baseRaw, ctx: buildCtx() });

		expect(mapped.title).toBe("Hello World");
		expect(mapped.slug).toBe("hello-world");
		expect(mapped.status).toBe("publish");
		expect(mapped.excerpt).toBe("Short excerpt");
		expect(mapped.blogId).toBe("blog-uuid");
		expect(mapped.blocks).toHaveLength(1);
		expect(mapped.blocks?.[0]?.name).toBe("core/paragraph");
		expect(mapped.blocks?.[0]?.content).toMatchObject({
			kind: "text",
			value: "Content here",
		});
		expect(mapped.other?.categories).toEqual(["News"]);
		expect(mapped.other?.tags).toEqual(["update"]);
		expect(mapped.other?.import?.wpId).toBe(42);
		expect(mapped.other?.import?.raw).toBeDefined();
	});

	it("suffixes slug when wpId already imported", async () => {
		const mapped = await mapWpPost({
			raw: baseRaw,
			ctx: buildCtx({ existingWpIds: new Set([42]) }),
		});

		expect(mapped.slug).toBe("hello-world-imported-42");
	});

	it("stores raw WP JSON in other.import", async () => {
		const mapped = await mapWpPost({ raw: baseRaw, ctx: buildCtx() });
		const raw = mapped.other?.import?.raw as WpPostRaw;
		expect(raw.id).toBe(42);
		expect(raw.link).toBe("https://example.com/hello-world/");
	});
});
