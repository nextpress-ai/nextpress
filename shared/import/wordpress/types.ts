import type { NewPost } from "../../schema-types";

export type WordPressEntity = "posts" | "pages" | "media" | "comments" | "users";

export type FeaturedImageMode = "reference" | "copy";

/** Minimal WP REST post list item (preview). */
export type WpPostPreview = {
	wpId: number;
	title: string;
	slug: string;
	status: string;
	date: string;
	link: string;
};

/** Full WP REST post payload (subset we map + store raw). */
export type WpPostRaw = {
	id: number;
	date: string;
	slug: string;
	status: string;
	link: string;
	title: { rendered: string };
	content: { rendered: string };
	excerpt: { rendered: string };
	featured_media: number;
	categories: number[];
	tags: number[];
};

export type WpMediaRaw = {
	id: number;
	source_url: string;
	mime_type: string;
	alt_text: string;
};

export type WpTermRaw = {
	id: number;
	name: string;
	slug: string;
};

export type WpApiErrorCode =
	| "connection_failed"
	| "not_wordpress"
	| "rest_blocked"
	| "no_posts"
	| "invalid_url"
	| "timeout";

export type WpDiscoverResult = {
	ok: boolean;
	baseUrl: string;
	siteName?: string;
	error?: {
		code: WpApiErrorCode;
		message: string;
		hint: string;
	};
	entities: Partial<
		Record<
			WordPressEntity,
			{ supported: boolean; total: number; reachable: boolean }
		>
	>;
};

export type WpListResult = {
	items: WpPostPreview[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
};

export type ImportContext = {
	baseUrl: string;
	blogId: string;
	authorId: string;
	featuredImageMode: FeaturedImageMode;
	categoryNames: Map<number, string>;
	tagNames: Map<number, string>;
	existingWpIds: Set<number>;
	resolveFeaturedImage: (params: {
		featuredMediaId: number;
	}) => Promise<string | null>;
	/**
	 * Resolves an inline content image URL to a (possibly sideloaded/local) URL.
	 * Optional: when absent, inline images keep their original remote URLs.
	 */
	resolveContentImage?: (params: {
		imageUrl: string;
	}) => Promise<string | null>;
};

export type MappedPost = Omit<NewPost, "id" | "createdAt" | "updatedAt">;

export type ImportItemResult =
	| { wpId: number; status: "imported"; postId: string; title: string }
	| { wpId: number; status: "skipped"; reason: string }
	| { wpId: number; status: "failed"; reason: string };

export type ImportBatchResult = {
	imported: Extract<ImportItemResult, { status: "imported" }>[];
	skipped: Extract<ImportItemResult, { status: "skipped" }>[];
	failed: Extract<ImportItemResult, { status: "failed" }>[];
};

export type WordPressPostsAdapter = {
	entity: "posts";
	discover: (params: { baseUrl: string }) => Promise<{
		total: number;
		reachable: boolean;
		siteName?: string;
	}>;
	list: (params: {
		baseUrl: string;
		page: number;
		perPage: number;
	}) => Promise<WpListResult>;
	fetchOne: (params: { baseUrl: string; wpId: number }) => Promise<WpPostRaw>;
	map: (params: { raw: WpPostRaw; ctx: ImportContext }) => Promise<MappedPost>;
};
