import type { HttpClient } from "../client/http-client.js";
import type { Page, Post } from "../types/domain.js";

export type PublicResource = {
	/** Fetch published page content for headless frontends by slug. */
	page: (params: { slug: string }) => Promise<Page>;
	/** Fetch published post content for headless frontends by slug. */
	post: (params: { slug: string }) => Promise<Post>;
	/** Resolve the configured front page without hard-coding its slug. */
	homepage: () => Promise<Page>;
};

/** Creates the public resource for headless published content (no auth). */
export function createPublicResource({ http }: { http: HttpClient }): PublicResource {
	return {
		/** Fetch published page content for headless frontends by slug. */
		page: async ({ slug }: { slug: string }): Promise<Page> => {
			if (!slug.trim()) {
				throw new Error("Invalid public.page slug: slug is required");
			}
			return http.request(`/api/public/page/${encodeURIComponent(slug)}`);
		},

		/** Fetch published post content for headless frontends by slug. */
		post: async ({ slug }: { slug: string }): Promise<Post> => {
			if (!slug.trim()) {
				throw new Error("Invalid public.post slug: slug is required");
			}
			return http.request(`/api/public/post/${encodeURIComponent(slug)}`);
		},

		/** Resolve the configured front page without hard-coding its slug. */
		homepage: async (): Promise<Page> => {
			return http.request("/api/public/homepage");
		},
	};
}
