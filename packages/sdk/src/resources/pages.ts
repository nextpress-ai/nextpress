import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	createPageSchema,
	idParamSchema,
	listPagesQuerySchema,
	restorePageVersionSchema,
	updatePageSchema,
} from "../schemas/index.js";
import type { DeleteMessage, Page, PageHistoryResponse, PaginatedResponse } from "../types/domain.js";
import type { CreatePageInput, ListPagesQuery, UpdatePageInput } from "../types/inputs.js";

/** Pages CRUD — primary page builder entity (blocks stored on `blocks` field). */
export function createPagesResource({ http }: { http: HttpClient }) {
	return {
		list: async (params: ListPagesQuery = {}): Promise<PaginatedResponse<Page, "pages">> => {
			const query = parseInput({
				schema: listPagesQuerySchema,
				input: params,
				label: "pages.list params",
			});
			return http.request("/api/pages", { query });
		},

		get: async ({ id }: { id: string }): Promise<Page> => {
			if (!id.trim()) throw new Error("Invalid pages.get id: id is required");
			return http.request(`/api/pages/${encodeURIComponent(id)}`);
		},

		create: async (input: CreatePageInput): Promise<Page> => {
			const body = parseInput({
				schema: createPageSchema,
				input,
				label: "pages.create input",
			});
			return http.request("/api/pages", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdatePageInput): Promise<Page> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.update id" });
			const body = parseInput({
				schema: updatePageSchema,
				input,
				label: "pages.update input",
			});
			return http.request(`/api/pages/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.delete id" });
			return http.request(`/api/pages/${id}`, { method: "DELETE" });
		},

		/** Version snapshots saved on each page update. */
		getHistory: async ({ id }: { id: string }): Promise<PageHistoryResponse> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.getHistory id" });
			return http.request(`/api/pages/${id}/history`);
		},

		restoreVersion: async ({
			id,
			version,
		}: {
			id: string;
			version: number;
		}): Promise<Page> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.restoreVersion id" });
			const body = parseInput({
				schema: restorePageVersionSchema,
				input: { version },
				label: "pages.restoreVersion input",
			});
			return http.request(`/api/pages/${id}/restore`, { method: "POST", body });
		},
	};
}

export type PagesResource = ReturnType<typeof createPagesResource>;
