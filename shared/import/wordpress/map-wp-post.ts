import { randomUUID } from "node:crypto";
import type { BlockConfig } from "../../schema-types";
import type { ImportContext, MappedPost, WpPostRaw } from "./types";
import { stripHtml } from "./strip-html";

const WP_STATUS_MAP: Record<string, string> = {
	publish: "publish",
	draft: "draft",
	private: "private",
	pending: "draft",
	future: "draft",
};

const buildHtmlBlock = (html: string): BlockConfig => ({
	id: randomUUID(),
	name: "core/html",
	type: "block",
	parentId: null,
	label: "HTML",
	category: "advanced",
	content: {
		kind: "structured",
		data: { content: html, className: "wp-import-content" },
	},
	styles: {},
	other: {},
});

const resolveUniqueSlug = (params: {
	slug: string;
	wpId: number;
	isDuplicate: boolean;
}): string =>
	params.isDuplicate ? `${params.slug}-imported-${params.wpId}` : params.slug;

/**
 * Maps a WordPress REST post into a NextPress insert payload.
 * Content stays as a single HTML block until Gutenberg parsing is implemented.
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
		isDuplicate: ctx.existingWpIds.has(wpId),
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
		blocks: raw.content.rendered ? [buildHtmlBlock(raw.content.rendered)] : [],
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
