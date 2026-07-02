import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	idParamSchema,
	listMediaQuerySchema,
	updateMediaSchema,
	uploadMediaSchema,
} from "../schemas/index.js";
import type { DeleteMessage, Media, PaginatedResponse } from "../types/domain.js";
import type { ListMediaQuery, UpdateMediaInput, UploadMediaInput } from "../types/inputs.js";

export function createMediaResource({ http }: { http: HttpClient }) {
	return {
		list: async (params: ListMediaQuery = {}): Promise<PaginatedResponse<Media, "media">> => {
			const query = parseInput({
				schema: listMediaQuerySchema,
				input: params,
				label: "media.list params",
			});
			return http.request("/api/media", { query });
		},

		get: async ({ id }: { id: string }): Promise<Media> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "media.get id" });
			return http.request(`/api/media/${id}`);
		},

		upload: async (input: UploadMediaInput): Promise<Media> => {
			const parsed = parseInput({
				schema: uploadMediaSchema,
				input,
				label: "media.upload input",
			});
			const formData = new FormData();
			formData.append("file", parsed.file);
			if (parsed.alt) formData.append("alt", parsed.alt);
			if (parsed.caption) formData.append("caption", parsed.caption);
			if (parsed.description) formData.append("description", parsed.description);
			if (parsed.siteId) formData.append("siteId", parsed.siteId);
			return http.request("/api/media", { method: "POST", body: formData });
		},

		update: async ({ id, ...input }: { id: string } & UpdateMediaInput): Promise<Media> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "media.update id" });
			const body = parseInput({
				schema: updateMediaSchema,
				input,
				label: "media.update input",
			});
			return http.request(`/api/media/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "media.delete id" });
			return http.request(`/api/media/${id}`, { method: "DELETE" });
		},
	};
}

export type MediaResource = ReturnType<typeof createMediaResource>;
