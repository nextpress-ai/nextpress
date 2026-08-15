import {
	bindablePostFromRecord,
	documentHasBlockName,
	nestBoundComments,
	type BindablePostDocument,
} from "@shared/bind-post-blocks";
import type { Filter, FindManyOptions } from "@shared/create-models";
import type { BlockConfig, Post } from "@shared/schema-types";
import { enrichPostForApi } from "@shared/posts/post-other";
import { attachPostAuthor } from "./attach-post-author";
import { loadAdjacentPosts, type AdjacentPostRow } from "./load-adjacent-posts";

type CommentRow = {
	id: string;
	parentId?: string | null;
	authorName?: string | null;
	content: string;
	createdAt?: string | Date | null;
	status?: string | null;
};

type PostRow = {
	id: string;
	title: string;
	slug?: string;
	authorId?: string | null;
	excerpt?: string | null;
	featuredImage?: string | null;
	publishedAt?: string | Date | null;
	createdAt?: string | Date | null;
	status?: string | null;
	password?: string | null;
	blogId?: string | null;
	blocks?: unknown;
	other?: unknown;
};

function toAdjacentRow(row: PostRow): AdjacentPostRow {
	return {
		id: row.id,
		title: row.title,
		slug: row.slug ?? row.id,
		featuredImage: row.featuredImage,
		status: row.status,
		blogId: row.blogId,
		createdAt: row.createdAt,
	};
}

type PrepareModels = {
	users: { findById: (id: string) => Promise<unknown> };
	comments: {
		findManyWhere: (
			where: Filter[],
			options?: FindManyOptions,
		) => Promise<CommentRow[]>;
	};
	posts: {
		findManyWhere: (
			where: Filter[],
			options?: FindManyOptions,
		) => Promise<PostRow[]>;
	};
};

/**
 * Bind a post document the same way the SPA public stack does, including
 * approved comments and adjacent posts when those blocks are in the tree.
 */
export async function preparePublishedPost({
	models,
	post,
}: {
	models: PrepareModels;
	post: PostRow;
}): Promise<{ post: BindablePostDocument; blocks: BlockConfig[] }> {
	const blocks = (Array.isArray(post.blocks) ? post.blocks : []) as BlockConfig[];
	const enriched = enrichPostForApi(post as Post);
	const withAuthor = await attachPostAuthor({ models, post: enriched });
	let bindable: BindablePostDocument = bindablePostFromRecord({
		id: withAuthor.id,
		authorId: withAuthor.authorId,
		title: withAuthor.title,
		excerpt: withAuthor.excerpt,
		featuredImage: withAuthor.featuredImage,
		publishedAt: withAuthor.publishedAt,
		createdAt: withAuthor.createdAt,
		categories: withAuthor.categories,
		tags: withAuthor.tags,
		author: withAuthor.author,
		other: withAuthor.other,
	});

	if (documentHasBlockName({ blocks, name: "post/comments" })) {
		const rows = await models.comments.findManyWhere(
			[
				{ where: "postId", equals: post.id },
				{ where: "status", equals: "approved" },
			],
			{ limit: 200 },
		);
		bindable = { ...bindable, comments: nestBoundComments(rows) };
	}

	if (documentHasBlockName({ blocks, name: "post/navigation" })) {
		const adjacent = await loadAdjacentPosts({
			post: toAdjacentRow(post),
			findSiblings: async (blogId) => {
				const rows = await models.posts.findManyWhere(
					[{ where: "blogId", equals: blogId }],
					{ limit: 200, orderBy: { property: "createdAt", order: "ascending" } },
				);
				return rows.map(toAdjacentRow);
			},
		});
		bindable = { ...bindable, adjacent };
	}

	return {
		post: bindable,
		blocks,
	};
}

export type { PostRow as PublishedContentRow };
