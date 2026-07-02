import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import { createSiteSchema, idParamSchema, updateSiteSchema } from "../schemas/index.js";
import type { DeleteMessage, Site } from "../types/domain.js";
import type { CreateSiteInput, UpdateSiteInput } from "../types/inputs.js";

export function createSitesResource({ http }: { http: HttpClient }) {
	return {
		list: async (): Promise<{ sites: Site[]; total: number }> => http.request("/api/sites"),

		get: async ({ id }: { id: string }): Promise<{ site: Site }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "sites.get id" });
			return http.request(`/api/sites/${id}`);
		},

		create: async (input: CreateSiteInput): Promise<{ site: Site }> => {
			const body = parseInput({
				schema: createSiteSchema,
				input,
				label: "sites.create input",
			});
			return http.request("/api/sites", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdateSiteInput): Promise<{ site: Site }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "sites.update id" });
			const body = parseInput({
				schema: updateSiteSchema,
				input,
				label: "sites.update input",
			});
			return http.request(`/api/sites/${id}`, { method: "PATCH", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage | { status: true }> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "sites.delete id" });
			return http.request(`/api/sites/${id}`, { method: "DELETE" });
		},
	};
}

export type SitesResource = ReturnType<typeof createSitesResource>;
