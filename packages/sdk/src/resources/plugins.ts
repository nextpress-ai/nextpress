import type { HttpClient } from "../client/http-client.js";
import type { Plugin } from "../types/domain.js";

export type PluginsResource = {
	/** List plugins for admin inventory before enabling features. */
	list: () => Promise<Plugin[]>;
};

/** Lists installed plugins (same data as the admin Plugins page will use). */
export function createPluginsResource({ http }: { http: HttpClient }): PluginsResource {
	return {
		/** List plugins for admin inventory before enabling features. */
		list: async (): Promise<Plugin[]> => http.request("/api/plugins"),
	};
}
