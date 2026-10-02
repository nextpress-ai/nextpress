import { describe, expect, it } from "vitest";
import { nestBoundComments } from "@shared/bind-post-blocks";
import { BUNDLED_FONTS_STYLESHEET } from "@shared/font-catalog";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";
import { responsiveGoldenFixtures } from "@shared/test/fixtures/responsive/fixtures";

describe("buildPublishedPageHtml", () => {
	it("includes site theme CSS when theme settings are provided", () => {
		const settings = {
			colors: { accent: "#112233", foreground: "#fefefe", background: "#101010" },
		};
		const html = buildPublishedPageHtml({
			page: {
				id: "page-themed",
				title: "Themed",
				blocks: [],
				other: { seo: {}, design: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/pages/page-themed",
			themeSettings: settings as Parameters<typeof buildPublishedPageHtml>[0]["themeSettings"],
			themeRawSettings: settings,
		});

		expect(html).toContain(".np-visitor-document");
		expect(html).toContain("--npb-accent: #112233");
	});

	it("renders full HTML with publish CSS and block content, not theme stub", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "page-1",
				title: "Stress Test",
				slug: "stress-test",
				blocks: responsiveGoldenFixtures.content,
				other: {
					seo: {},
					design: { containerWidth: "1200px", padding: "2rem 1rem" },
				},
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/pages/page-1",
		});

		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain('id="main-content" class="has-page-shell"');
		expect(html).toContain("max-width: none");
		expect(html).toContain("min-height: 100dvh");
		expect(html).toContain(".np-public-block-stack.has-page-shell > .wp-block-page-shell");
		expect(html).toContain("Heading level 1");
		expect(html).toContain(".wp-block-image img");
		expect(html).toContain("is-stacked-on-mobile");
		expect(html).not.toContain("Custom rendered content");
		expect(html).not.toContain("/assets/css/main.css");
		expect(html).not.toContain("hydrate.js");
	});

	it("binds post fields and omits comment placeholders when comments are empty", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "post-1",
				title: "First Post",
				blocks: [
					{
						id: "t",
						name: "post/title",
						type: "block",
						parentId: null,
						content: { kind: "structured", data: { text: "", tag: "h1" } },
					},
					{
						id: "c",
						name: "post/comments",
						type: "block",
						parentId: null,
						content: { kind: "structured", data: { showForm: true } },
					},
					{
						id: "md",
						name: "core/markdown",
						type: "block",
						parentId: null,
						content: { kind: "markdown", value: "Hello **world**" },
					},
				],
				other: { seo: {}, design: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/posts/post-1",
			post: {
				id: "post-1",
				title: "First Post",
				comments: [],
				adjacent: { prev: null, next: null },
			},
		});

		expect(html).toContain("First Post");
		expect(html).toContain("Hello");
		expect(html).toContain("<strong>world</strong>");
		expect(html).toContain("No comments yet.");
		expect(html).not.toContain("Jane Doe");
		expect(html).not.toContain("hydrate.js");
		expect(html).not.toContain("Error rendering block");
	});

	it("renders nested markdown through the sync SSR path", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "page-md",
				title: "Nested markdown",
				blocks: [
					{
						id: "cols",
						name: "core/columns",
						type: "container",
						parentId: null,
						content: { kind: "structured", data: {} },
						children: [
							{
								id: "md",
								name: "core/markdown",
								type: "block",
								parentId: "cols",
								content: { kind: "markdown", value: "Nested **bold**" },
							},
						],
					},
				],
				other: { seo: {}, design: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/pages/page-md",
		});

		expect(html).toContain("Nested");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).not.toContain("Loading core/markdown");
		expect(html).not.toContain("Error rendering block");
	});

	it("renders layout and typography golden fixtures without stub HTML", () => {
		for (const [name, blocks] of Object.entries(responsiveGoldenFixtures)) {
			if (name === "legacy") continue;
			const html = buildPublishedPageHtml({
				page: {
					id: `page-${name}`,
					title: `${name} stress`,
					slug: `${name}-stress`,
					blocks,
					other: { seo: {}, design: {} },
				} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
				canonicalUrl: `http://localhost:5000/pages/page-${name}`,
			});
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).not.toContain("Custom rendered content");
		}
	});

	it("renders nested comment replies and a single bundled-fonts stylesheet", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "post-1",
				title: "First Post",
				blocks: [
					{
						id: "c",
						name: "post/comments",
						type: "block",
						parentId: null,
						content: { kind: "structured", data: { showForm: true, showCount: true } },
					},
				],
				other: { seo: {}, design: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/pages/post-1",
			post: {
				id: "post-1",
				title: "First Post",
				comments: nestBoundComments([
					{
						id: "a",
						parentId: null,
						authorName: "Ada",
						content: "Hi",
						createdAt: "2026-01-01",
					},
					{
						id: "b",
						parentId: "a",
						authorName: "Bob",
						content: "Hello back",
						createdAt: "2026-01-02",
					},
				]),
				adjacent: { prev: null, next: null },
			},
		});

		expect(html).toContain("Ada");
		expect(html).toContain("Hi");
		expect(html).toContain("Bob");
		expect(html).toContain("Hello back");
		expect(html).toContain("Comments (2)");
		expect(html).toContain("padding-left:16px");
		expect(html).not.toContain("Jane Doe");
		expect(html.split(BUNDLED_FONTS_STYLESHEET)).toHaveLength(2);
	});

	it("includes hydrate.js only when a block is reactive", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "page-live",
				title: "Live",
				blocks: [
					{
						id: "h",
						name: "core/heading",
						type: "block",
						parentId: null,
						content: { kind: "text", value: "Hello", level: 1 },
						isReactive: true,
					},
				],
				other: { seo: {}, design: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://localhost:5000/pages/page-live",
		});
		expect(html).toContain("hydrate.js");
	});

	it("publishes the shell's scrollbar look and side padding", () => {
		const shell = (data: Record<string, unknown>) => ({
			id: "shell",
			name: "core/page-shell",
			type: "container",
			parentId: null,
			content: { kind: "structured", data },
			styles: {},
			settings: {},
			children: [
				{
					id: "h",
					name: "core/heading",
					type: "block",
					parentId: "shell",
					content: { kind: "text", value: "Hello" },
					styles: {},
					settings: {},
				},
			],
		});
		const build = (data: Record<string, unknown>) =>
			buildPublishedPageHtml({
				page: {
					id: "page-shell-look",
					title: "Look",
					blocks: [shell(data)],
					other: { seo: {}, design: {} },
				} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
				canonicalUrl: "http://localhost:5000/pages/page-shell-look",
			});

		const html = build({
			scrollbar: { look: "custom", width: "12px" },
			paddingInline: "4rem",
			contentAlign: "left",
		});
		expect(html).toContain("html::-webkit-scrollbar{width:12px;height:12px}");
		expect(html).toContain("@supports not selector(::-webkit-scrollbar)");
		expect(html).toMatch(/margin-left:\s*4rem/);
		expect(html).not.toMatch(/padding-left:\s*4rem/);

		const standard = build({});
		expect(standard).toContain("html::-webkit-scrollbar{width:12px;height:12px}");
		expect(standard).toContain("border-radius:0");
		expect(standard).not.toContain("scrollbar-width:thin");
		expect(standard).not.toContain("scrollbar-color");
	});

	it("names the site in the title and reserves the image box", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "page-photo",
				title: "walkableca",
				featuredImage: "/uploads/cover.jpg",
				blocks: [
					{
						id: "img",
						name: "core/image",
						type: "block",
						content: {
							kind: "media",
							url: "/uploads/cover.jpg",
							mediaType: "image",
							alt: "A path",
							intrinsicWidth: "800",
							intrinsicHeight: "600",
						},
					},
				],
				other: { seo: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://127.0.0.1:5000/walkableca",
			site: { name: "nextpress.ai", url: "https://nextpress.ai", description: "City walks" },
		});

		expect(html).toContain("walkableca | nextpress.ai");
		expect(html).toContain('rel="canonical" href="https://nextpress.ai/walkableca"');
		expect(html).toContain('property="og:description" content="City walks"');
		expect(html).toContain('property="og:image" content="https://nextpress.ai/uploads/cover.jpg"');
		expect(html).toContain('width="800"');
		expect(html).toContain('height="600"');
		expect(html).toContain("aspect-ratio");
		expect(html).not.toContain("Your Site");
	});

	it("uses a picture on the page when no featured image is set", () => {
		const html = buildPublishedPageHtml({
			page: {
				id: "page-plain",
				title: "walkableca",
				blocks: [
					{
						id: "join",
						name: "core/button",
						type: "block",
						content: { kind: "text", value: "Join", url: "/Contact/#form" },
					},
					{
						id: "img",
						name: "core/image",
						type: "block",
						content: { kind: "media", url: "/uploads/hero.jpg", mediaType: "image" },
					},
				],
				other: { seo: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://127.0.0.1:5000/walkableca",
			site: { name: "nextpress.ai", url: "https://nextpress.ai", logoUrl: "/uploads/logo.png" },
		});

		expect(html).toContain('property="og:image" content="https://nextpress.ai/uploads/hero.jpg"');
		expect(html).not.toContain("og:image\" content=\"https://nextpress.ai/Contact");
		expect(html).toContain('name="twitter:card" content="summary_large_image"');

		const textOnly = buildPublishedPageHtml({
			page: {
				id: "page-text",
				title: "Notes",
				blocks: [],
				other: { seo: {} },
			} as Parameters<typeof buildPublishedPageHtml>[0]["page"],
			canonicalUrl: "http://127.0.0.1:5000/notes",
			site: { name: "nextpress.ai", url: "https://nextpress.ai" },
		});
		expect(textOnly).not.toContain("og:image");
		expect(textOnly).toContain('name="twitter:card" content="summary"');
	});
});
