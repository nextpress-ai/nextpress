import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapWpPage } from "./map-wp-page";
import type { ImportContext, WpPostRaw } from "./types";

/** WP pages REST shape — no categories/tags (unlike posts). */
const walkablePage2315: WpPostRaw = {
	id: 2315,
	slug: "sample-page",
	status: "publish",
	date: "2024-01-01T00:00:00",
	link: "https://walkableca.com/sample-page/",
	title: { rendered: "Sample Page" },
	content: { rendered: "<p>Hello from Elementor</p>" },
	excerpt: { rendered: "" },
	featured_media: 0,
};

const buildCtx = (): Omit<ImportContext, "blogId"> & { siteId: string } => ({
	baseUrl: "https://walkableca.com",
	siteId: "site-1",
	authorId: "author-uuid",
	featuredImageMode: "reference",
	categoryNames: new Map(),
	tagNames: new Map(),
	existingWpIds: new Set(),
	resolveFeaturedImage: vi.fn().mockResolvedValue(null),
});

describe("mapWpPage", () => {
	beforeEach(() => {
		vi.stubGlobal("crypto", { randomUUID: () => "block-uuid-1" });
	});

	it("maps a page without categories or tags (walkableca #2315 shape)", async () => {
		const mapped = await mapWpPage({
			raw: walkablePage2315,
			ctx: buildCtx(),
		});

		expect(mapped.siteId).toBe("site-1");
		expect(mapped.slug).toBe("sample-page");
		expect(mapped.title).toBe("Sample Page");
		expect(mapped.blocks?.length).toBeGreaterThan(0);
		expect(mapped.other?.import?.wpId).toBe(2315);
	});
});
