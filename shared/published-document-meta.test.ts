import { describe, expect, it } from "vitest";
import {
	buildPublishedDocumentMeta,
	publicSiteName,
	publishedCanonicalUrl,
	publishedPreviewImageUrl,
	renderPublishedSocialMeta,
} from "./published-document-meta.js";
import type { BlockConfig } from "./schema-types.js";

describe("published document meta", () => {
	it("uses the domain when the site name was never set", () => {
		expect(
			publicSiteName({
				settingsName: "NextPress Site",
				recordName: "NextPress",
				siteUrl: "https://nextpress.ai",
			}),
		).toBe("nextpress.ai");
	});

	it("keeps a name someone actually set", () => {
		expect(
			publicSiteName({
				settingsName: "Walkable CA",
				recordName: "walkableca",
				siteUrl: "https://nextpress.ai",
			}),
		).toBe("Walkable CA");
	});

	it("builds a title, a canonical address on the site domain, and preview tags", () => {
		const canonicalUrl = publishedCanonicalUrl({
			requestUrl: "http://127.0.0.1:5000/walkableca?utm=one",
			siteUrl: "https://nextpress.ai",
		});
		const meta = buildPublishedDocumentMeta({
			pageTitle: "walkableca",
			siteName: "nextpress.ai",
			siteDescription: "WordPress-Compatible CMS",
			canonicalUrl,
			imageUrl: "/uploads/cover.jpg",
			kind: "website",
		});

		expect(canonicalUrl).toBe("https://nextpress.ai/walkableca");
		expect(meta.title).toBe("walkableca | nextpress.ai");
		expect(meta.description).toBe("");
		expect(meta.imageUrl).toBe("https://nextpress.ai/uploads/cover.jpg");
		const html = renderPublishedSocialMeta(meta);
		expect(html).toContain('property="og:title" content="walkableca | nextpress.ai"');
		expect(html).toContain('property="og:image" content="https://nextpress.ai/uploads/cover.jpg"');
		expect(html).not.toContain("Your Site");
	});

	it("uses the first picture on the page when no featured image is set", () => {
		const blocks = [
			{
				id: "logo",
				name: "core/header",
				type: "block",
				content: { kind: "structured", data: { brand: { kind: "logo", logoUrl: "/uploads/mark.svg" } } },
			},
			{
				id: "join",
				name: "core/button",
				type: "block",
				content: { kind: "text", value: "Join", url: "/Contact/#form" },
			},
			{
				id: "hero",
				name: "core/image",
				type: "block",
				content: { kind: "media", mediaType: "image", url: "/uploads/hero.jpg" },
			},
		] as BlockConfig[];
		expect(publishedPreviewImageUrl({ blocks, logoUrl: "/uploads/site.png" })).toBe("/uploads/hero.jpg");
		expect(publishedPreviewImageUrl({ featuredImage: "/uploads/cover.jpg", blocks })).toBe("/uploads/cover.jpg");
		expect(publishedPreviewImageUrl({ blocks: blocks.slice(0, 1), logoUrl: "/uploads/site.png" })).toBe(
			"/uploads/mark.svg",
		);
		expect(publishedPreviewImageUrl({ logoUrl: "/uploads/site.png" })).toBe("/uploads/site.png");
		expect(publishedPreviewImageUrl({})).toBe("");
	});

	it("leaves page links alone and still finds pictures stored under other fields", () => {
		const [button, mediaText, videoCover, filled, headerPhoto] = [
			{
				id: "join",
				name: "core/button",
				type: "block",
				parentId: null,
				content: { kind: "text", value: "Join", url: "/api/forms/submit" },
			},
			{
				id: "shot",
				name: "core/media-text",
				type: "container",
				parentId: null,
				content: {
					kind: "structured",
					data: { mediaUrl: "https://cdn.test/board.png", mediaType: "image" },
				},
			},
			{
				id: "reel",
				name: "core/cover",
				type: "container",
				parentId: null,
				content: { kind: "structured", data: { url: "https://cdn.test/reel.mp4", backgroundType: "video" } },
			},
			{
				id: "band",
				name: "core/group",
				type: "container",
				parentId: null,
				content: { kind: "empty" },
				other: {
					fills: {
						background: { kind: "image", url: "/uploads/band.jpg", size: "cover", position: "center", repeat: false },
					},
				},
			},
			{
				id: "top",
				name: "core/header",
				type: "block",
				parentId: null,
				content: {
					kind: "structured",
					data: {
						backgroundFill: {
							kind: "image",
							url: "/uploads/header.jpg",
							size: "cover",
							position: "center",
							repeat: false,
						},
						brand: { kind: "logo", logoUrl: "/uploads/mark.svg" },
					},
				},
			},
		] as BlockConfig[];
		expect(publishedPreviewImageUrl({ blocks: [button, mediaText] })).toBe("https://cdn.test/board.png");
		expect(publishedPreviewImageUrl({ blocks: [button], logoUrl: "/uploads/site.png" })).toBe("/uploads/site.png");
		expect(publishedPreviewImageUrl({ blocks: [videoCover, filled], logoUrl: "/uploads/site.png" })).toBe(
			"/uploads/band.jpg",
		);
		expect(publishedPreviewImageUrl({ blocks: [headerPhoto, mediaText] })).toBe("https://cdn.test/board.png");
		expect(publishedPreviewImageUrl({ blocks: [headerPhoto] })).toBe("/uploads/header.jpg");
	});
});
