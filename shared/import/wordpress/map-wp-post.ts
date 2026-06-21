import type { ImportContext, MappedPost, WpPostRaw } from "./types";
import { stripHtml } from "./strip-html";
import { htmlToBlocks, collectImageUrls } from "./html-to-blocks";

const WP_STATUS_MAP: Record<string, string> = {
	publish: "publish",
	draft: "draft",
	private: "private",
	pending: "draft",
	future: "draft",
};

/**
 * Pre-resolves every inline image URL (sideload in copy mode) so the synchronous
 * HTML→blocks parser can swap remote URLs for local ones.
 */
const buildImageUrlMap = async (params: {
	html: string;
	ctx: ImportContext;
}): Promise<Map<string, string>> => {
	const map = new Map<string, string>();
	if (!params.ctx.resolveContentImage) return map;
	for (const url of collectImageUrls(params.html)) {
		const resolved = await params.ctx.resolveContentImage({ imageUrl: url });
		if (resolved) map.set(url, resolved);
	}
	return map;
};

const resolveUniqueSlug = (params: {
	slug: string;
	wpId: number;
	isDuplicate: boolean;
}): string =>
	params.isDuplicate ? `${params.slug}-imported-${params.wpId}` : params.slug;

/**
 * Maps a WordPress REST post into a NextPress insert payload. Post content is
 * parsed into native NextPress blocks (heading/paragraph/image/list/quote/…)
 * so it is editable like any other content; unmappable markup is preserved as
 * `core/html`. The raw WP payload is kept in `other.import.raw` for reference.
 */
export const mapWpPost = async (params: {
	raw: WpPostRaw;
	ctx: ImportContext;
}): Promise<MappedPost> => {
	const { raw, ctx } = params;
	const wpId = raw.id;
	const title = stripHtml(raw.title.rendered) || `Imported post ${wpId}`;
	const slug = resolveUniqueSlug({
		slug: raw.slug,
		wpId,
		isDuplicate: ctx.existingWpIds.has(wpId) && !ctx.updatingExisting,
	});
	const status = WP_STATUS_MAP[raw.status] ?? "draft";
	const excerpt = stripHtml(raw.excerpt.rendered);

	const categoryNames = raw.categories
		.map((id) => ctx.categoryNames.get(id))
		.filter((name): name is string => !!name);

	const tagNames = raw.tags
		.map((id) => ctx.tagNames.get(id))
		.filter((name): name is string => !!name);

	const featuredImage =
		raw.featured_media > 0
			? await ctx.resolveFeaturedImage({ featuredMediaId: raw.featured_media })
			: null;

	const publishedAt =
		status === "publish" && raw.date ? new Date(raw.date) : undefined;

	const html = raw.content.rendered || "";
	const imageUrlMap = await buildImageUrlMap({ html, ctx });
	const blocks = htmlToBlocks(html, {
		resolveImageUrl: (url) => imageUrlMap.get(url) ?? url,
	});

	return {
		title,
		slug,
		status,
		authorId: ctx.authorId,
		blogId: ctx.blogId,
		excerpt: excerpt || null,
		featuredImage,
		publishedAt,
		allowComments: true,
		password: null,
		parentId: null,
		templateId: null,
		blocks,
		settings: {},
		other: {
			categories: categoryNames,
			tags: tagNames,
			import: {
				source: "wordpress",
				domain: ctx.baseUrl,
				wpId,
				wpLink: raw.link,
				importedAt: new Date().toISOString(),
				raw: raw as unknown as Record<string, unknown>,
			},
		},
	};
};
