import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { createSiteSchema, idParamSchema, updateSiteSchema } from "../schemas/index.js";
import type { DeleteMessage, Site } from "../types/domain.js";
import type { CreateSiteInput, UpdateSiteInput } from "../types/inputs.js";

export type SitesResource = {
	/** Enumerate sites on a multi-site install for switcher or provisioning UIs. */
	list: () => Promise<{ sites: Site[]; total: number }>;
	/** Load one site before theme activation or scoped API calls. */
	get: (params: { id: string }) => Promise<{ site: Site }>;
	/** Stand up a new site on a multi-site install. */
	create: (input: CreateSiteInput) => Promise<{ site: Site }>;
	/** Patch site settings without recreating the site record. */
	update: (params: { id: string } & UpdateSiteInput) => Promise<{ site: Site }>;
	/** Tear down a site and its scoped content from the install. */
	delete: (params: { id: string }) => Promise<DeleteMessage | { status: true }>;
};

export function createSitesResource({ http }: { http: HttpClient }): SitesResource {
	return {
		/** Enumerate sites on a multi-site install for switcher or provisioning UIs. */
		list: async (): Promise<{ sites: Site[]; total: number }> => http.request("/api/sites"),

		/** Load one site before theme activation or scoped API calls. */
		get: async ({ id }: { id: string }): Promise<{ site: Site }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "sites.get id" });
			return http.request(`/api/sites/${id}`);
		},

		/** Stand up a new site on a multi-site install. */
		create: async (input: CreateSiteInput): Promise<{ site: Site }> => {
			const body = parseInput({
				schema: createSiteSchema,
				input,
				label: "sites.create input",
			});
			return http.request("/api/sites", { method: "POST", body });
		},

		/** Patch site settings without recreating the site record. */
		update: async ({ id, ...input }: { id: string } & UpdateSiteInput): Promise<{ site: Site }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "sites.update id" });
			const body = parseInput({
				schema: updateSiteSchema,
				input,
				label: "sites.update input",
			});
			return http.request(`/api/sites/${id}`, { method: "PATCH", body });
		},

		/** Tear down a site and its scoped content from the install. */
		delete: async ({ id }: { id: string }): Promise<DeleteMessage | { status: true }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "sites.delete id" });
			return http.request(`/api/sites/${id}`, { method: "DELETE" });
		},
	};
}
