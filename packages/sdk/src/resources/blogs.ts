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

export type BlogsResource = {
	/** Paginate blogs for multi-section sites without hand-rolling query strings. */
	list: (params?: ListBlogsQuery) => Promise<PaginatedResponse<Blog, "blogs">>;
	/** Load one blog before attaching posts or editing its settings. */
	get: (params: { id: string }) => Promise<Blog>;
	/** Bootstrap a new blog section when expanding a multi-blog install. */
	create: (input: CreateBlogInput) => Promise<Blog>;
	/** Persist blog metadata changes without touching its posts. */
	update: (params: { id: string } & UpdateBlogInput) => Promise<Blog>;
	/** Decommission a blog section and its routing in one call. */
	delete: (params: { id: string }) => Promise<DeleteMessage>;
};

export function createBlogsResource({ http }: { http: HttpClient }): BlogsResource {
	return {
		/** Paginate blogs for multi-section sites without hand-rolling query strings. */
		list: async (params: ListBlogsQuery = {}): Promise<PaginatedResponse<Blog, "blogs">> => {
			const query = parseInput({
				schema: listBlogsQuerySchema,
				input: params,
				label: "blogs.list params",
			});
			return http.request("/api/blogs", { query });
		},

		/** Load one blog before attaching posts or editing its settings. */
		get: async ({ id }: { id: string }): Promise<Blog> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "blogs.get id" });
			return http.request(`/api/blogs/${id}`);
		},

		/** Bootstrap a new blog section when expanding a multi-blog install. */
		create: async (input: CreateBlogInput): Promise<Blog> => {
			const body = parseInput({
				schema: createBlogSchema,
				input,
				label: "blogs.create input",
			});
			return http.request("/api/blogs", { method: "POST", body });
		},

		/** Persist blog metadata changes without touching its posts. */
		update: async ({ id, ...input }: { id: string } & UpdateBlogInput): Promise<Blog> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "blogs.update id" });
			const body = parseInput({
				schema: updateBlogSchema,
				input,
				label: "blogs.update input",
			});
			return http.request(`/api/blogs/${id}`, { method: "PUT", body });
		},

		/** Decommission a blog section and its routing in one call. */
		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "blogs.delete id" });
			return http.request(`/api/blogs/${id}`, { method: "DELETE" });
		},
	};
}
