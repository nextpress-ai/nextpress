import type { HttpClient } from "../client/http-client.js";
import { safeHttpRequest } from "../client/safe-request.js";
import type { SdkResult } from "../client/sdk-result.js";
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
import { buildDefaultPageOther } from "../types/page-other.js";

export type PagesResource = {
	/** Paginate pages for admin lists and headless routing indexes. */
	list: (params?: ListPagesQuery) => Promise<PaginatedResponse<Page, "pages">>;
	/** Load a page by UUID or slug before editing its block tree. */
	get: (params: { id: string }) => Promise<Page>;
	/** Seed a new page with optional blocks for the page builder. */
	create: (input: CreatePageInput) => Promise<SdkResult<Page>>;
	/** Persist page metadata and block tree — requires expectedVersion from a prior get(). */
	update: (params: { id: string } & UpdatePageInput) => Promise<SdkResult<Page>>;
	/** Remove a page and its published route. */
	delete: (params: { id: string }) => Promise<SdkResult<DeleteMessage>>;
	/** Roll back editor mistakes using server-side version snapshots. */
	getHistory: (params: { id: string }) => Promise<PageHistoryResponse>;
	/** Restore a prior block tree without manual copy-paste from history. */
	restoreVersion: (params: { id: string; version: number }) => Promise<SdkResult<Page>>;
};

/** Pages CRUD — primary page builder entity (blocks stored on `blocks` field). */
export function createPagesResource({ http }: { http: HttpClient }): PagesResource {
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

		create: async (input: CreatePageInput): Promise<SdkResult<Page>> => {
			const body = parseInput({
				schema: createPageSchema,
				input: {
					...input,
					other: buildDefaultPageOther(input.other),
				},
				label: "pages.create input",
			});
			return safeHttpRequest(http, "/api/pages", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdatePageInput): Promise<SdkResult<Page>> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.update id" });
			const body = parseInput({
				schema: updatePageSchema,
				input,
				label: "pages.update input",
			});
			return safeHttpRequest(http, `/api/pages/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<SdkResult<DeleteMessage>> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.delete id" });
			return safeHttpRequest(http, `/api/pages/${id}`, { method: "DELETE" });
		},

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
		}): Promise<SdkResult<Page>> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "pages.restoreVersion id" });
			const body = parseInput({
				schema: restorePageVersionSchema,
				input: { version },
				label: "pages.restoreVersion input",
			});
			return safeHttpRequest(http, `/api/pages/${id}/restore`, { method: "POST", body });
		},
	};
}
