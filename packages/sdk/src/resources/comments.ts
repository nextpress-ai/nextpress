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

export function createCommentsResource({ http }: { http: HttpClient }) {
	return {
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

		get: async ({ id }: { id: string }): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.get id" });
			return http.request(`/api/comments/${id}`);
		},

		create: async (input: CreateCommentInput): Promise<Comment> => {
			const body = parseInput({
				schema: createCommentSchema,
				input,
				label: "comments.create input",
			});
			return http.request("/api/comments", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdateCommentInput): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.update id" });
			const body = parseInput({
				schema: updateCommentSchema,
				input,
				label: "comments.update input",
			});
			return http.request(`/api/comments/${id}`, { method: "PUT", body });
		},

		approve: async ({ id }: { id: string }): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.approve id" });
			return http.request(`/api/comments/${id}/approve`, { method: "PATCH" });
		},

		spam: async ({ id }: { id: string }): Promise<Comment> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.spam id" });
			return http.request(`/api/comments/${id}/spam`, { method: "PATCH" });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "comments.delete id" });
			return http.request(`/api/comments/${id}`, { method: "DELETE" });
		},
	};
}

export type CommentsResource = ReturnType<typeof createCommentsResource>;
