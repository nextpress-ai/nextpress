import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	createCommentSchema,
	idParamSchema,
	listCommentsQuerySchema,
	updateCommentSchema,
} from "../schemas/index.js";
import type { Comment, DeleteMessage, PaginatedResponse } from "../types/domain.js";
import type { CreateCommentInput, ListCommentsQuery, UpdateCommentInput } from "../types/inputs.js";

export type CommentsResource = {
	/** Filter moderation queues by status and post without raw API query strings. */
	list: (params?: ListCommentsQuery) => Promise<PaginatedResponse<Comment, "comments">>;
	/** Inspect one thread entry before approve, spam, or delete actions. */
	get: (params: { id: string }) => Promise<Comment>;
	/** Submit comments from forms or integrations with validated payloads. */
	create: (input: CreateCommentInput) => Promise<Comment>;
	/** Edit body or status when moderation shortcuts are not enough. */
	update: (params: { id: string } & UpdateCommentInput) => Promise<Comment>;
	/** Publish pending comments with one call matching dashboard moderation. */
	approve: (params: { id: string }) => Promise<Comment>;
	/** Quarantine spam without a full update payload. */
	spam: (params: { id: string }) => Promise<Comment>;
	/** Permanently remove a comment from the moderation queue. */
	delete: (params: { id: string }) => Promise<DeleteMessage>;
};

export function createCommentsResource({ http }: { http: HttpClient }): CommentsResource {
	return {
		/** Filter moderation queues by status and post without raw API query strings. */
		list: async (
			params: ListCommentsQuery = {},
		): Promise<PaginatedResponse<Comment, "comments">> => {
			const query = parseInput({
				schema: listCommentsQuerySchema,
				input: params,
				label: "comments.list params",
			});
			return http.request("/api/comments", { query });
		},

		/** Inspect one thread entry before approve, spam, or delete actions. */
		get: async ({ id }: { id: string }): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.get id" });
			return http.request(`/api/comments/${id}`);
		},

		/** Submit comments from forms or integrations with validated payloads. */
		create: async (input: CreateCommentInput): Promise<Comment> => {
			const body = parseInput({
				schema: createCommentSchema,
				input,
				label: "comments.create input",
			});
			return http.request("/api/comments", { method: "POST", body });
		},

		/** Edit body or status when moderation shortcuts are not enough. */
		update: async ({ id, ...input }: { id: string } & UpdateCommentInput): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.update id" });
			const body = parseInput({
				schema: updateCommentSchema,
				input,
				label: "comments.update input",
			});
			return http.request(`/api/comments/${id}`, { method: "PUT", body });
		},

		/** Publish pending comments with one call matching dashboard moderation. */
		approve: async ({ id }: { id: string }): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.approve id" });
			return http.request(`/api/comments/${id}/approve`, { method: "PATCH" });
		},

		/** Quarantine spam without a full update payload. */
		spam: async ({ id }: { id: string }): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.spam id" });
			return http.request(`/api/comments/${id}/spam`, { method: "PATCH" });
		},

		/** Permanently remove a comment from the moderation queue. */
		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.delete id" });
			return http.request(`/api/comments/${id}`, { method: "DELETE" });
		},
	};
}
