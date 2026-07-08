import type { HttpClient } from "../client/http-client.js";
import type { HooksResponse } from "../types/responses.js";

export type HooksResource = {
	/** Inspect registered hooks when debugging plugin or theme behavior. */
	list: () => Promise<HooksResponse>;
};

/** Debug resource exposing registered WordPress-style hooks. */
export function createHooksResource({ http }: { http: HttpClient }): HooksResource {
	return {
		/** Inspect registered hooks when debugging plugin or theme behavior. */
		list: async (): Promise<HooksResponse> => http.request("/api/hooks"),
	};
}
