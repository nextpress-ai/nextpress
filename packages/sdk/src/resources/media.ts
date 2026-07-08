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

export type MediaResource = {
	/** Browse the media library for pickers and asset management UIs. */
	list: (params?: ListMediaQuery) => Promise<PaginatedResponse<Media, "media">>;
	/** Resolve one asset's metadata before embedding in page builder blocks. */
	get: (params: { id: string }) => Promise<Media>;
	/** Add files to the library via multipart upload for block references. */
	upload: (input: UploadMediaInput) => Promise<Media>;
	/** Change alt text and captions without re-uploading the file. */
	update: (params: { id: string } & UpdateMediaInput) => Promise<Media>;
	/** Remove orphaned assets from the library. */
	delete: (params: { id: string }) => Promise<DeleteMessage>;
};

export function createMediaResource({ http }: { http: HttpClient }): MediaResource {
	return {
		/** Browse the media library for pickers and asset management UIs. */
		list: async (params: ListMediaQuery = {}): Promise<PaginatedResponse<Media, "media">> => {
			const query = parseInput({
				schema: listMediaQuerySchema,
				input: params,
				label: "media.list params",
			});
			return http.request("/api/media", { query });
		},

		/** Resolve one asset's metadata before embedding in page builder blocks. */
		get: async ({ id }: { id: string }): Promise<Media> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "media.get id" });
			return http.request(`/api/media/${id}`);
		},

		/** Add files to the library via multipart upload for block references. */
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

		/** Change alt text and captions without re-uploading the file. */
		update: async ({ id, ...input }: { id: string } & UpdateMediaInput): Promise<Media> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "media.update id" });
			const body = parseInput({
				schema: updateMediaSchema,
				input,
				label: "media.update input",
			});
			return http.request(`/api/media/${id}`, { method: "PUT", body });
		},

		/** Remove orphaned assets from the library. */
		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "media.delete id" });
			return http.request(`/api/media/${id}`, { method: "DELETE" });
		},
	};
}
