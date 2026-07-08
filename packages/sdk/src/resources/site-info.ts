import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { updateSiteInfoSchema } from "../schemas/index.js";
import type { ApiEnvelope, SiteInfo } from "../types/domain.js";
import type { UpdateSiteInfoInput } from "../types/inputs.js";

export type SiteInfoResource = {
	/** Read branding and active theme before rendering the site header. */
	get: () => Promise<ApiEnvelope<SiteInfo>>;
	/** Update logo, favicon, or theme without touching other settings. */
	update: (input: UpdateSiteInfoInput) => Promise<ApiEnvelope<SiteInfo>>;
};

/** Site branding: logo, favicon, active theme. */
export function createSiteInfoResource({ http }: { http: HttpClient }): SiteInfoResource {
	return {
		/** Read branding and active theme before rendering the site header. */
		get: async (): Promise<ApiEnvelope<SiteInfo>> => http.request("/api/site"),

		/** Update logo, favicon, or theme without touching other settings. */
		update: async (input: UpdateSiteInfoInput): Promise<ApiEnvelope<SiteInfo>> => {
			const body = parseInput({
				schema: updateSiteInfoSchema,
				input,
				label: "site.update input",
			});
			return http.request("/api/site", { method: "PATCH", body });
		},
	};
}
