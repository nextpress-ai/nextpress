import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	createBlogSchema,
	idParamSchema,
	listBlogsQuerySchema,
	updateBlogSchema,
} from "../schemas/index.js";
import type { Blog, DeleteMessage, PaginatedResponse } from "../types/domain.js";
import type { CreateBlogInput, ListBlogsQuery, UpdateBlogInput } from "../types/inputs.js";

export function createBlogsResource({ http }: { http: HttpClient }) {
	return {
		list: async (params: ListBlogsQuery = {}): Promise<PaginatedResponse<Blog, "blogs">> => {
			const query = parseInput({
				schema: listBlogsQuerySchema,
				input: params,
				label: "blogs.list params",
			});
			return http.request("/api/blogs", { query });
		},

		get: async ({ id }: { id: string }): Promise<Blog> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "blogs.get id" });
			return http.request(`/api/blogs/${id}`);
		},

		create: async (input: CreateBlogInput): Promise<Blog> => {
			const body = parseInput({
				schema: createBlogSchema,
				input,
				label: "blogs.create input",
			});
			return http.request("/api/blogs", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdateBlogInput): Promise<Blog> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "blogs.update id" });
			const body = parseInput({
				schema: updateBlogSchema,
				input,
				label: "blogs.update input",
			});
			return http.request(`/api/blogs/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "blogs.delete id" });
			return http.request(`/api/blogs/${id}`, { method: "DELETE" });
		},
	};
}

export type BlogsResource = ReturnType<typeof createBlogsResource>;
