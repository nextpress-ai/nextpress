import type { HttpClient } from "../client/http-client.js";
import { parseInput } from "../client/validate-input.js";
import {
	createPostSchema,
	idParamSchema,
	listPostsQuerySchema,
	updatePostSchema,
} from "../schemas/index.js";
import type { DeleteMessage, PaginatedResponse, Post } from "../types/domain.js";
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from "../types/inputs.js";

const normalizePostsListQuery = (params: ListPostsQuery & { blogId?: string }) => {
	const blog_id = params.blog_id ?? params.blogId;
	const { blogId: _blogId, ...rest } = params;
	return blog_id ? { ...rest, blog_id } : rest;
};

/** Posts CRUD — blocks live on the post payload (page builder post editor). */
export function createPostsResource({ http }: { http: HttpClient }) {
	return {
		list: async (params: ListPostsQuery = {}): Promise<PaginatedResponse<Post, "posts">> => {
			const query = parseInput({
				schema: listPostsQuerySchema,
				input: normalizePostsListQuery(params),
				label: "posts.list params",
			});
			return http.request("/api/posts", { query });
		},

		get: async ({ id }: { id: string }): Promise<Post> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "posts.get id" });
			return http.request(`/api/posts/${id}`);
		},

		create: async (input: CreatePostInput): Promise<Post> => {
			const body = parseInput({
				schema: createPostSchema,
				input,
				label: "posts.create input",
			});
			return http.request("/api/posts", { method: "POST", body });
		},

		update: async ({ id, ...input }: { id: string } & UpdatePostInput): Promise<Post> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "posts.update id" });
			const body = parseInput({
				schema: updatePostSchema,
				input,
				label: "posts.update input",
			});
			return http.request(`/api/posts/${id}`, { method: "PUT", body });
		},

		delete: async ({ id }: { id: string }): Promise<DeleteMessage> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "posts.delete id" });
			return http.request(`/api/posts/${id}`, { method: "DELETE" });
		},
	};
}

export type PostsResource = ReturnType<typeof createPostsResource>;
