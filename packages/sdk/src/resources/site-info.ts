import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { updateSiteInfoSchema } from "../schemas/index.js";
import type { ApiEnvelope, SiteInfo } from "../types/domain.js";
import type { UpdateSiteInfoInput } from "../types/inputs.js";

/** Site branding: logo, favicon, active theme. */
export function createSiteInfoResource({ http }: { http: HttpClient }) {
	return {
		get: async (): Promise<ApiEnvelope<SiteInfo>> => http.request("/api/site"),

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

export type SiteInfoResource = ReturnType<typeof createSiteInfoResource>;
