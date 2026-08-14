import type { BlockConfig, BlockContent } from "./schema-types";
import type { AuthorDisplay } from "./author-display";
import { parsePostOther } from "./posts/post-other";
import { headingLevelFromTag, readBlockContentData } from "./read-block-content";

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
							? {
									name: post.author.name,
									avatar: post.author.avatar,
									bio: post.author.bio,
								}
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

	if (block.name === "post/comments" || block.name === "post/navigation") {
		return {
			...block,
			children,
			content: asStructured(withPostId(data, post)),
		};
	}

	return children === block.children ? block : { ...block, children };
}
