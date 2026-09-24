import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { createPluginSchema, idParamSchema } from "../schemas/index.js";
import type { CreatePluginInput } from "../types/inputs.js";
import type { Plugin } from "../types/domain.js";

export type PluginsResource = {
	/** List plugins for the admin inventory. */
	list: () => Promise<Plugin[]>;
	/** Register a plugin. It starts off. */
	create: (input: CreatePluginInput) => Promise<Plugin>;
	/** Turn a plugin on. */
	activate: (params: { id: string }) => Promise<Plugin>;
	/** Turn a plugin off. */
	deactivate: (params: { id: string }) => Promise<Plugin>;
	/** Remove a plugin. */
	remove: (params: { id: string }) => Promise<void>;
};

/** Plugin inventory used by the admin Plugins page. */
export function createPluginsResource({ http }: { http: HttpClient }): PluginsResource {
	return {
		/** List plugins for the admin inventory. */
		list: async (): Promise<Plugin[]> => http.request("/api/plugins"),

		/** Register a plugin. It starts off. */
		create: async (input: CreatePluginInput): Promise<Plugin> => {
			const body = parseInput({
				schema: createPluginSchema,
				input,
				label: "plugins.create input",
			});
			return http.request("/api/plugins", { method: "POST", body });
		},

		/** Turn a plugin on. */
		activate: async ({ id }: { id: string }): Promise<Plugin> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "plugins.activate id" });
			return http.request(`/api/plugins/${id}/activate`, { method: "POST" });
		},

		/** Turn a plugin off. */
		deactivate: async ({ id }: { id: string }): Promise<Plugin> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "plugins.deactivate id" });
			return http.request(`/api/plugins/${id}/deactivate`, { method: "POST" });
		},

		/** Remove a plugin. */
		remove: async ({ id }: { id: string }): Promise<void> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "plugins.remove id" });
			await http.request(`/api/plugins/${id}`, { method: "DELETE" });
		},
	};
}
