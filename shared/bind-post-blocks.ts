import type { BlockConfig, BlockContent } from "./schema-types";
import { mergeAuthorDisplay, type AuthorDisplay } from "./author-display";
import { parsePostOther } from "./posts/post-other";
import { headingLevelFromTag, readBlockContentData } from "./read-block-content";

export type BoundComment = {
	id: string;
	author: string;
	date: string;
	content: string;
	replies: BoundComment[];
};

export type BoundAdjacentPost = {
	id: string;
	title: string;
	slug: string;
	featuredImage?: string | null;
};

export type BindablePostDocument = {
	id?: string;
	authorId?: string | null;
	title?: string | null;
	excerpt?: string | null;
	featuredImage?: string | null;
	publishedAt?: string | Date | null;
	createdAt?: string | Date | null;
	categories?: string[] | null;
	tags?: string[] | null;
	author?: AuthorDisplay | null;
	other?: unknown;
	comments?: BoundComment[];
	adjacent?: {
		prev?: BoundAdjacentPost | null;
		next?: BoundAdjacentPost | null;
	};
};

const toIso = (value: string | Date | null | undefined): string => {
	if (!value) return "";
	if (value instanceof Date) return value.toISOString();
	return String(value);
};

const asStructured = (data: Record<string, unknown>): BlockContent =>
	({ kind: "structured", data }) as BlockContent;

const withPostId = (
	data: Record<string, unknown>,
	post: BindablePostDocument,
): Record<string, unknown> =>
	post.id && !data.postId ? { ...data, postId: post.id } : data;

/**
 * Flatten taxonomy from `other` when the API payload did not already attach it.
 */
export function bindablePostFromRecord(
	post: BindablePostDocument,
): BindablePostDocument {
	const parsed = parsePostOther(post.other);
	return {
		...post,
		categories: post.categories ?? parsed.categories,
		tags: post.tags ?? parsed.tags,
	};
}

/**
 * Rewrite post-* blocks so the public renderer can show the post and author
 * instead of empty structured payloads or hardcoded placeholders.
 */
export function bindPostBlocks({
	blocks,
	post,
}: {
	blocks: BlockConfig[];
	post: BindablePostDocument;
}): BlockConfig[] {
	return blocks.map((block) => bindOneBlock({ block, post }));
}

function bindOneBlock({
	block,
	post,
}: {
	block: BlockConfig;
	post: BindablePostDocument;
}): BlockConfig {
	const data = readBlockContentData(block.content);
	const children = Array.isArray(block.children)
		? bindPostBlocks({ blocks: block.children, post })
		: block.children;

	if (block.name === "post/title") {
		const text =
			(typeof data.text === "string" && data.text.trim()) ||
			(typeof post.title === "string" ? post.title : "") ||
			"";
		const level = headingLevelFromTag(data.tag ?? data.level, 1);
		return {
			...block,
			children,
			content: { kind: "text", value: text, level } as BlockContent,
		};
	}

	if (block.name === "post/excerpt") {
		const text =
			(typeof data.text === "string" && data.text.trim()) ||
			(typeof post.excerpt === "string" ? post.excerpt : "") ||
			"";
		return {
			...block,
			children,
			content: { kind: "text", value: text } as BlockContent,
		};
	}

	if (block.name === "post/featured-image") {
		const url =
			(typeof data.url === "string" && data.url.trim()) ||
			(typeof post.featuredImage === "string" ? post.featuredImage : "") ||
			"";
		return {
			...block,
			children,
			content: {
				kind: "media",
				url,
				alt: typeof data.alt === "string" ? data.alt : "Featured image",
				caption: typeof data.caption === "string" ? data.caption : undefined,
				objectFit: data.objectFit,
				mediaType: "image",
			} as BlockContent,
		};
	}

	if (block.name === "post/author-box") {
		return {
			...block,
			children,
			content: asStructured(
				withPostId(
					{
						...data,
						...(post.author
							? mergeAuthorDisplay({
									override: {
										name:
											typeof data.name === "string"
												? data.name
												: undefined,
										avatar:
											typeof data.avatar === "string"
												? data.avatar
												: undefined,
										bio:
											typeof data.bio === "string"
												? data.bio
												: undefined,
									},
									live: post.author,
								})
							: {}),
						...(post.authorId && !data.authorId
							? { authorId: post.authorId }
							: {}),
					},
					post,
				),
			),
		};
	}

	if (block.name === "post/info") {
		return {
			...block,
			children,
			content: asStructured(
				withPostId(
					{
						...data,
						publishedAt:
							toIso(post.publishedAt) ||
							toIso(post.createdAt) ||
							data.publishedAt,
						categories: post.categories ?? data.categories,
						tags: post.tags ?? data.tags,
					},
					post,
				),
			),
		};
	}

	if (block.name === "post/comments") {
		return {
			...block,
			children,
			content: asStructured(
				withPostId(
					{
						...data,
						comments: post.comments ?? [],
					},
					post,
				),
			),
		};
	}

	if (block.name === "post/navigation") {
		return {
			...block,
			children,
			content: asStructured(
				withPostId(
					{
						...data,
						prev: post.adjacent?.prev ?? null,
						next: post.adjacent?.next ?? null,
					},
					post,
				),
			),
		};
	}

	return children === block.children ? block : { ...block, children };
}

/** True when the tree contains a block with this name (nested children included). */
export function documentHasBlockName({
	blocks,
	name,
}: {
	blocks: BlockConfig[];
	name: string;
}): boolean {
	for (const block of blocks) {
		if (block.name === name) return true;
		if (Array.isArray(block.children) && documentHasBlockName({ blocks: block.children, name })) {
			return true;
		}
	}
	return false;
}

type FlatCommentRow = {
	id: string;
	parentId?: string | null;
	authorName?: string | null;
	content: string;
	createdAt?: string | Date | null;
};

/** Nest approved comment rows for SSR (and tests) without a second renderer. */
export function nestBoundComments(rows: FlatCommentRow[]): BoundComment[] {
	const byId = new Map<string, BoundComment>();
	for (const row of rows) {
		byId.set(row.id, {
			id: row.id,
			author: row.authorName?.trim() || "Anonymous",
			date: toIso(row.createdAt),
			content: row.content,
			replies: [],
		});
	}
	const roots: BoundComment[] = [];
	for (const row of rows) {
		const node = byId.get(row.id);
		if (!node) continue;
		const parent = row.parentId ? byId.get(row.parentId) : undefined;
		if (parent) parent.replies.push(node);
		else roots.push(node);
	}
	return roots;
}
