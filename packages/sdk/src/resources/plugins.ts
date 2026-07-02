import type { HttpClient } from "../client/http-client.js";
import type { Plugin } from "../types/domain.js";

/** Lists installed plugins (same data as the admin Plugins page will use). */
export function createPluginsResource({ http }: { http: HttpClient }) {
	return {
		/** List all plugins for the install. */
		list: async (): Promise<Plugin[]> => http.request("/api/plugins"),
	};
}

export type PluginsResource = ReturnType<typeof createPluginsResource>;
