import type { HttpClient } from "../client/http-client.js";

/** A category or tag with how many of the site's posts carry it. */
export type TaxonomyTerm = { name: string; count: number };

/**
 * Category and tag lists come from the posts themselves (they are stored in a post's `other`
 * field, not in their own table), so these are read-only: a term is renamed or added by editing a
 * post.
 */
export type TaxonomyResource = {
	/** Categories used by this site's published posts, most used first. */
	categories: (params?: { siteId?: string }) => Promise<TaxonomyTerm[]>;
	/** Tags used by this site's published posts, most used first. */
	tags: (params?: { siteId?: string }) => Promise<TaxonomyTerm[]>;
};

/** Creates the taxonomy resource for listing categories and tags. */
export function createTaxonomyResource({ http }: { http: HttpClient }): TaxonomyResource {
	return {
		categories: async (params: { siteId?: string } = {}): Promise<TaxonomyTerm[]> => {
			return http.request("/api/categories", { query: { siteId: params.siteId } });
		},
		tags: async (params: { siteId?: string } = {}): Promise<TaxonomyTerm[]> => {
			return http.request("/api/tags", { query: { siteId: params.siteId } });
		},
	};
}
