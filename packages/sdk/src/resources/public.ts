import type { HttpClient } from "../client/http-client.js";
import type { Page, Post } from "../types/domain.js";

/** Creates the public resource for headless published content (no auth). */
export function createPublicResource({ http }: { http: HttpClient }) {
	return {
		/** Fetch a published page by slug. */
		page: async ({ slug }: { slug: string }): Promise<Page> => {
			if (!slug.trim()) {
				throw new Error("Invalid public.page slug: slug is required");
			}
			return http.request(`/api/public/page/${encodeURIComponent(slug)}`);
		},

		/** Fetch a published post by slug. */
		post: async ({ slug }: { slug: string }): Promise<Post> => {
			if (!slug.trim()) {
				throw new Error("Invalid public.post slug: slug is required");
			}
			return http.request(`/api/public/post/${encodeURIComponent(slug)}`);
		},

		/** Resolve the configured homepage page. */
		homepage: async (): Promise<Page> => {
			return http.request("/api/public/homepage");
		},
	};
}

export type PublicResource = ReturnType<typeof createPublicResource>;
