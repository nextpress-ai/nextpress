import type { HttpClient } from "../client/http-client.js";
import type { HooksResponse } from "../types/responses.js";

/** Debug resource exposing registered WordPress-style hooks. */
export function createHooksResource({ http }: { http: HttpClient }) {
	return {
		/** List registered actions and filters (admin debug endpoint). */
		list: async (): Promise<HooksResponse> => http.request("/api/hooks"),
	};
}

export type HooksResource = ReturnType<typeof createHooksResource>;
