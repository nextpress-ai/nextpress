import type { BlockConfig, BlockContent } from "./schema-types";
import { readBlockContentData } from "./read-block-content";

export type PostListOpenIn = "overlay" | "page";

export type BoundPostListItem = {
	id: string;
	title: string;
	slug: string;
	excerpt: string;
	featuredImage: string;
	publishedAt: string;
	authorName: string;
};

export type PostListContentShape = {
	layout?: string;
	postsPerPage?: number;
	showExcerpt?: boolean;
	showFeaturedImage?: boolean;
	showDate?: boolean;
	showAuthor?: boolean;
	blogId?: string;
	orderBy?: string;
	order?: string;
	openIn?: PostListOpenIn;
	className?: string;
	posts?: BoundPostListItem[];
};

const asStructured = (data: Record<string, unknown>): BlockContent =>
	({ kind: "structured", data }) as BlockContent;

/** Overlay hash used by the grid so back/close restores the index. */
export function postOverlayHash(slug: string): string {
	return `#post/${encodeURIComponent(slug)}`;
}

/** True when a featured-image URL is http(s) or a same-origin path. */
export function isSafePublicMediaUrl(url: string): boolean {
	const trimmed = url.trim();
	if (!trimmed) return false;
	if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

/** Read `#post/{slug}` from a location hash. */
export function readPostOverlaySlug(hash: string): string {
	const raw = hash.startsWith("#") ? hash.slice(1) : hash;
	if (!raw.startsWith("post/")) return "";
	try {
		return decodeURIComponent(raw.slice("post/".length));
	} catch {
		return "";
	}
}

/** Defaults for a post list: grid index, details in overlay. */
export function readPostListContent(content: unknown): Required<
	Pick<
		PostListContentShape,
		| "layout"
		| "postsPerPage"
		| "showExcerpt"
		| "showFeaturedImage"
		| "showDate"
		| "showAuthor"
		| "blogId"
		| "orderBy"
		| "order"
		| "openIn"
		| "className"
	>
> & { posts: BoundPostListItem[] } {
	const data = readBlockContentData(content) as PostListContentShape;
	const openIn = data.openIn === "page" ? "page" : "overlay";
	const layout =
		data.layout === "list" || data.layout === "cards" || data.layout === "grid"
			? data.layout
			: "grid";
	const posts = Array.isArray(data.posts)
		? data.posts.filter((item): item is BoundPostListItem => {
				return Boolean(item && typeof item === "object" && typeof item.slug === "string");
			})
		: [];
	return {
		layout,
		postsPerPage: Math.max(1, Number(data.postsPerPage) || 6),
		showExcerpt: data.showExcerpt !== false,
		showFeaturedImage: data.showFeaturedImage !== false,
		showDate: data.showDate !== false,
		showAuthor: data.showAuthor !== false,
		blogId: typeof data.blogId === "string" ? data.blogId : "",
		orderBy: data.orderBy === "title" ? "title" : "date",
		order: data.order === "asc" ? "asc" : "desc",
		openIn,
		className: typeof data.className === "string" ? data.className : "",
		posts,
	};
}

/** Stamp fetched posts onto a post/list block for SSR and tests. */
export function bindPostListBlock({
	block,
	posts,
}: {
	block: BlockConfig;
	posts: BoundPostListItem[];
}): BlockConfig {
	if (block.name !== "post/list") return block;
	const data = readBlockContentData(block.content);
	return {
		...block,
		content: asStructured({ ...data, posts }),
	};
}

/** Rewrite every post/list in a tree (nested groups included). */
export function bindPostListBlocks({
	blocks,
	resolvePosts,
}: {
	blocks: BlockConfig[];
	resolvePosts: (content: ReturnType<typeof readPostListContent>) => BoundPostListItem[];
}): BlockConfig[] {
	return blocks.map((block) => {
		const children = Array.isArray(block.children)
			? bindPostListBlocks({ blocks: block.children, resolvePosts })
			: block.children;
		const next = children === block.children ? block : { ...block, children };
		if (next.name !== "post/list") return next;
		const content = readPostListContent(next.content);
		return bindPostListBlock({ block: next, posts: resolvePosts(content) });
	});
}
