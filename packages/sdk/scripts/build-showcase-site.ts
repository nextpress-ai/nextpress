/**
 * Seeds a published showcase homepage: CMS posts in a responsive grid,
 * details open in overlay. Requires packages/sdk integration.config.ts.
 *
 * Run from packages/sdk: pnpm exec tsx scripts/build-showcase-site.ts
 */
import { createNextpress } from "../src/index.js";
import { loadIntegrationTestConfig } from "../src/test/integration/config.js";
import { waitForServerReady } from "../src/test/integration/wait-for-server.js";

const SHOWCASE_PAGE_SLUG = "work";
const SHOWCASE_BLOG_SLUG = "field-notes";

const POSTS = [
	{
		slug: "type-that-holds-a-room",
		title: "Type that holds a room",
		excerpt: "Why a narrow sidebar still needs a loud headline, and how we stopped fighting the measure.",
		body: "Most marketing pages shout in the hero and whisper everywhere else. A working CMS has the opposite problem: the inspector is dense, the canvas is quiet. We keep display type tight, tracking pulled in, and body copy under 65 characters so a grid of posts can breathe on a phone without shrinking the story.",
	},
	{
		slug: "grid-then-overlay",
		title: "Grid first, then the overlay",
		excerpt: "Index pages should stay an index. Details come to you — they should not yank the whole layout away.",
		body: "Click a card, keep the grid. The overlay is a reading surface, not a second site. On a small screen it is full viewport; on a desk it is a framed column. Close it and you are still looking at the same twelve pieces of work.",
	},
	{
		slug: "posts-are-the-cms",
		title: "Posts are the CMS",
		excerpt: "If the homepage is hand-coded, you do not have a CMS. You have a brochure with a login screen.",
		body: "Every card on this page is a published post. Edit one in the admin, reload, and the grid changes. That is the contract: agents and humans write the same rows. Overlay HTML is rendered from those blocks, not from a parallel mock.",
	},
	{
		slug: "motion-without-circus",
		title: "Motion without the circus",
		excerpt: "A 150ms height ease is enough. Infinite floating cards belong in a pitch deck, not a reading list.",
		body: "The overlay opens because you asked it to. Nothing loops in the background. Reduced-motion visitors skip the scale on chips and keep the same information. That is not a lesser experience; it is the same product with less noise.",
	},
	{
		slug: "one-accent-is-plenty",
		title: "One accent is plenty",
		excerpt: "Zinc surfaces, one ink, no purple glow. The work is the color.",
		body: "We dropped the leftover AI purple the first time a client asked why the admin looked like a crypto wallet. Neutral base, one accent under 80% saturation, and type doing the hierarchy. If a card needs a picture it gets one; if not, the title still carries the row.",
	},
	{
		slug: "built-to-be-edited",
		title: "Built to be edited Tuesday",
		excerpt: "A showcase that only an engineer can update is a screenshot.",
		body: "Change the excerpt. Swap the overlay for a full page in Post List settings. Add a seventh post. Publish. The homepage does not need a deploy. That is the whole point of putting this on Nextpress instead of a static folder of HTML.",
	},
] as const;

async function main(): Promise<void> {
	const config = await loadIntegrationTestConfig();
	if (!config) {
		throw new Error(
			"Copy src/test/integration/integration.config.example.ts to integration.config.ts and enable it with an API key.",
		);
	}

	await waitForServerReady({
		baseUrl: config.baseUrl,
		timeoutMs: config.serverReadyTimeoutMs,
	});

	const client = createNextpress({
		baseUrl: config.baseUrl,
		apiKey: config.apiKey,
		siteId: config.siteId,
		timeout: config.requestTimeoutMs,
	});

	const blogs = await client.blogs.list({ per_page: 50 });
	const existingBlog = (blogs.blogs ?? []).find((blog) => blog.slug === SHOWCASE_BLOG_SLUG);
	const blog =
		existingBlog ??
		(await client.blogs.create({
			name: "Field notes",
			slug: SHOWCASE_BLOG_SLUG,
			siteId: config.siteId,
		}));

	for (const post of POSTS) {
		const listed = await client.posts.list({
			blogId: blog.id,
			per_page: 50,
			status: "any",
		});
		const already = (listed.posts ?? []).find((row) => row.slug === post.slug);
		if (already) {
			if (already.status !== "publish") {
				await client.posts.update({
					id: already.id,
					expectedVersion: already.version ?? 0,
					status: "publish",
					publishedAt: new Date().toISOString(),
				});
			}
			continue;
		}

		const created = await client.posts.create({
			title: post.title,
			slug: post.slug,
			blogId: blog.id,
			excerpt: post.excerpt,
			status: "publish",
			publishedAt: new Date().toISOString(),
			blocks: [
				client.blocks.heading({ text: post.title, level: 1 }),
				client.blocks.paragraph({ text: post.excerpt }),
				client.blocks.paragraph({ text: post.body }),
			],
		});
		if (created.isErr) throw created.error;
	}

	const pages = await client.pages.list({ per_page: 50, status: "any" });
	const existingPage = (pages.pages ?? []).find((page) => page.slug === SHOWCASE_PAGE_SLUG);

	const homeBlocks = [
		client.blocks.cover({
			content: {
				minHeight: 320,
				dimRatio: 0,
				overlayColor: "#18181b",
				innerContent:
					"<p style=\"letter-spacing:0.14em;text-transform:uppercase;font-size:0.75rem;color:#a1a1aa\">Field notes</p><h1 style=\"margin:0.4rem 0 0;font-size:clamp(2.4rem,6vw,4.2rem);letter-spacing:-0.05em;line-height:0.95;color:#fafafa\">Work in the open</h1>",
			},
			settings: { styles: { backgroundColor: "#18181b", color: "#fafafa" } },
		}),
		client.blocks.container({
			settings: { styles: { padding: "3rem 0 1rem", maxWidth: "1200px" } },
			children: [
				client.blocks.heading({ text: "Selected posts", level: 2 }),
				client.blocks.paragraph({
					text: "CMS-managed. Grid on every screen. Click a card for the overlay — the index stays put.",
				}),
				client.blocks.postList({
					settings: {
						content: {
							blogId: blog.id,
							layout: "grid",
							postsPerPage: 6,
							openIn: "overlay",
							showExcerpt: true,
							showFeaturedImage: true,
							showDate: true,
							showAuthor: true,
							orderBy: "date",
							order: "desc",
						},
					},
				}),
			],
		}),
	];

	if (existingPage) {
		const current = await client.pages.get({ id: existingPage.id });
		const updated = await client.pages.update({
			id: current.id,
			expectedVersion: current.version ?? 0,
			title: "Work",
			status: "publish",
			blocks: homeBlocks,
		});
		if (updated.isErr) throw updated.error;
	} else {
		const created = await client.pages.create({
			title: "Work",
			slug: SHOWCASE_PAGE_SLUG,
			status: "publish",
			blocks: homeBlocks,
		});
		if (created.isErr) throw created.error;
	}

	await client.options.set({
		name: "homepage_page_slug",
		value: SHOWCASE_PAGE_SLUG,
		siteId: config.siteId,
	});

	console.log(`Showcase ready: ${config.baseUrl}/`);
	console.log(`Homepage slug: ${SHOWCASE_PAGE_SLUG}`);
	console.log(`Blog: ${blog.name} (${blog.id})`);
	console.log("Click a grid card — details should open in overlay.");
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
