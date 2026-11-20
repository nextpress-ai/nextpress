import type { HttpClient } from "../client/http-client.js";
import type { Page, PaginatedResponse, Post } from "../types/domain.js";

export type PublicPostsQuery = {
	page?: number;
	per_page?: number;
	blogId?: string;
	sort?: string;
	order?: "asc" | "desc";
};

export type PublicPost = Post & {
	renderedHtml?: string;
};

/** One search result: where to open it and the words to show. */
export type PublicSearchResult = {
	path: string;
	pageTitle: string;
	heading: string;
	excerpt: string;
	/** Higher is a better match. */
	score: number;
};

export type PublicSearchAnswer = {
	query: string;
	results: PublicSearchResult[];
};

export type PublicResource = {
	/** Fetch published page content for headless frontends by slug. */
	page: (params: { slug: string }) => Promise<Page>;
	/** Fetch published post content for headless frontends by slug. */
	post: (params: { slug: string }) => Promise<PublicPost>;
	/** Paginate published posts for grids and overlays (no auth). */
	posts: (params?: PublicPostsQuery) => Promise<PaginatedResponse<Post, "posts">>;
	/** Resolve the configured front page without hard-coding its slug. */
	homepage: () => Promise<Page>;
	/** Search the site's published pages: where to open each hit and a short excerpt. */
	search: (params: { query: string; limit?: number }) => Promise<PublicSearchAnswer>;
};

/** Creates the public resource for headless published content (no auth). */
export function createPublicResource({ http }: { http: HttpClient }): PublicResource {
	return {
		/** Fetch published page content for headless frontends by slug. */
		page: async ({ slug }: { slug: string }): Promise<Page> => {
			if (!slug.trim()) {
				throw new Error("Invalid public.page slug: slug is required");
			}
			return http.request(`/api/public/page/${encodeURIComponent(slug)}`, { auth: false });
		},

		/** Fetch published post content for headless frontends by slug. */
		post: async ({ slug }: { slug: string }): Promise<PublicPost> => {
			if (!slug.trim()) {
				throw new Error("Invalid public.post slug: slug is required");
			}
			return http.request(`/api/public/post/${encodeURIComponent(slug)}`, { auth: false });
		},

		/** Paginate published posts for grids and overlays (no auth). */
		posts: async (params: PublicPostsQuery = {}): Promise<PaginatedResponse<Post, "posts">> => {
			return http.request("/api/public/posts", {
				auth: false,
				query: {
					page: params.page,
					per_page: params.per_page,
					blogId: params.blogId,
					sort: params.sort,
					order: params.order,
				},
			});
		},

		/** Resolve the configured front page without hard-coding its slug. */
		homepage: async (): Promise<Page> => {
			return http.request("/api/public/homepage", { auth: false });
		},

		/** Search the site's published pages; an empty query answers with no results. */
		search: async ({ query, limit }: { query: string; limit?: number }): Promise<PublicSearchAnswer> => {
			const q = query.trim();
			if (!q) return { query: "", results: [] };
			return http.request("/api/public/search", {
				auth: false,
				query: { q, limit },
			});
		},
	};
}
