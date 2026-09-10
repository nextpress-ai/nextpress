import type { Filter, FindManyOptions } from "@shared/create-models";
import type { BlockConfig, Post } from "@shared/schema-types";
import { documentHasBlockName } from "@shared/bind-post-blocks";
import {
	bindPostListBlock,
	type BoundPostListItem,
	readPostListContent,
} from "@shared/bind-post-list";
import { attachPostAuthor } from "./attach-post-author";
import { toModelOrderBy } from "@shared/content-list-query";
import { enrichPostForApi } from "@shared/posts/post-other";

type PostRow = {
	id: string;
	title?: string | null;
	slug?: string | null;
	excerpt?: string | null;
	featuredImage?: string | null;
	publishedAt?: string | Date | null;
	createdAt?: string | Date | null;
	status?: string | null;
	blogId?: string | null;
	authorId?: string | null;
	other?: unknown;
};

type BindModels = {
	users: { findById: (id: string) => Promise<unknown> };
	blogs: {
		findManyWhere: (where: Filter[], options?: FindManyOptions) => Promise<Array<{ id: string }>>;
	};
	posts: {
		findManyWhere: (where: Filter[], options?: FindManyOptions) => Promise<PostRow[]>;
	};
};

const toIso = (value: string | Date | null | undefined): string => {
	if (!value) return "";
	if (value instanceof Date) return value.toISOString();
	return String(value);
};

/**
 * Fill post/list blocks with published posts for this site so SSR HTML
 * matches the public SPA (no dummy "Post Title 1" cards).
 */
export async function bindPublishedPostLists({
	models,
	siteId,
	blocks,
}: {
	models: BindModels;
	siteId: string;
	blocks: BlockConfig[];
}): Promise<BlockConfig[]> {
	if (!documentHasBlockName({ blocks, name: "post/list" })) return blocks;

	const blogs = await models.blogs.findManyWhere([{ where: "siteId", equals: siteId }]);
	const siteBlogIds = blogs.map((blog) => blog.id);
	return walk({ models, siteBlogIds, blocks });
}

async function walk({
	models,
	siteBlogIds,
	blocks,
}: {
	models: BindModels;
	siteBlogIds: string[];
	blocks: BlockConfig[];
}): Promise<BlockConfig[]> {
	const next: BlockConfig[] = [];
	for (const block of blocks) {
		const children = Array.isArray(block.children)
			? await walk({ models, siteBlogIds, blocks: block.children })
			: block.children;
		let current = children === block.children ? block : { ...block, children };
		if (current.name === "post/list") {
			const content = readPostListContent(current.content);
			const posts = await loadPublishedListItems({
				models,
				siteBlogIds,
				blogId: content.blogId,
				limit: content.postsPerPage,
				orderBy: content.orderBy,
				order: content.order,
			});
			current = bindPostListBlock({ block: current, posts });
		}
		next.push(current);
	}
	return next;
}

async function loadPublishedListItems({
	models,
	siteBlogIds,
	blogId,
	limit,
	orderBy,
	order,
}: {
	models: BindModels;
	siteBlogIds: string[];
	blogId: string;
	limit: number;
	orderBy: string;
	order: string;
}): Promise<BoundPostListItem[]> {
	const allowed = blogId ? (siteBlogIds.includes(blogId) ? [blogId] : []) : siteBlogIds;
	if (allowed.length === 0) return [];

	const sortField = orderBy === "title" ? "title" : "createdAt";
	const rows = await models.posts.findManyWhere(
		[
			{ where: "status", equals: "publish" },
			{ where: "blogId", in: allowed },
		],
		{
			limit,
			orderBy: toModelOrderBy({
				sort: sortField,
				order: order === "asc" ? "asc" : "desc",
			}),
		},
	);

	const items: BoundPostListItem[] = [];
	for (const row of rows) {
		const enriched = enrichPostForApi(row as Post);
		const withAuthor = await attachPostAuthor({ models, post: enriched });
		items.push({
			id: row.id,
			title: row.title?.trim() || "Untitled",
			slug: row.slug || row.id,
			excerpt: row.excerpt ?? "",
			featuredImage: typeof row.featuredImage === "string" ? row.featuredImage : "",
			publishedAt: toIso(row.publishedAt ?? row.createdAt),
			authorName: withAuthor.author?.name ?? "",
		});
	}
	return items;
}
