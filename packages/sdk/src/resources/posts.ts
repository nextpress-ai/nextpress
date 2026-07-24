import type { HttpClient } from "../client/http-client.js";
import { safeHttpRequest } from "../client/safe-request.js";
import type { SdkResult } from "../client/sdk-result.js";
import { parseInput } from "../client/validate-input.js";
import type { BlockPatchOp } from "../blocks/patch-block-tree.js";
import {
	runPatchBlocks,
	type PatchBlocksParams,
	type PatchBlocksSuccess,
} from "../blocks/run-patch-blocks.js";
import {
	createPostSchema,
	idParamSchema,
	listPostsQuerySchema,
	updatePostSchema,
} from "../schemas/index.js";
import type { DeleteMessage, PaginatedResponse, Post } from "../types/domain.js";
import type { CreatePostInput, ListPostsQuery, UpdatePostInput } from "../types/inputs.js";
import { mergePageOtherOnWrite } from "../types/page-other.js";

const normalizePostsListQuery = (params: ListPostsQuery & { blogId?: string }) => {
	const blog_id = params.blog_id ?? params.blogId;
	const { blogId: _blogId, ...rest } = params;
	return blog_id ? { ...rest, blog_id } : rest;
};

export type PostsResource = {
	/** Paginate posts for blog indexes and admin lists. */
	list: (params?: ListPostsQuery) => Promise<PaginatedResponse<Post, "posts">>;
	/** Load one post before editing its block-based content. */
	get: (params: { id: string }) => Promise<Post>;
	/** Publish a new post with optional blocks from the page builder. */
	create: (input: CreatePostInput) => Promise<SdkResult<Post>>;
	/** Save post metadata and block tree — requires expectedVersion from a prior get(). */
	update: (params: { id: string } & UpdatePostInput) => Promise<SdkResult<Post>>;
	/**
	 * Apply path ops to the post block tree, validate, then save with expectedVersion.
	 */
	patchBlocks: (params: PatchBlocksParams) => Promise<SdkResult<PatchBlocksSuccess<Post>>>;
	/** Remove a post from the blog and its public route. */
	delete: (params: { id: string }) => Promise<SdkResult<DeleteMessage>>;
};

/** Posts CRUD — blocks live on the post payload (page builder post editor). */
export function createPostsResource({ http }: { http: HttpClient }): PostsResource {
	const get = async ({ id }: { id: string }): Promise<Post> => {
		parseInput({ schema: idParamSchema, input: { id }, label: "posts.get id" });
		return http.request(`/api/posts/${id}`);
	};

	const update = async ({
		id,
		...input
	}: { id: string } & UpdatePostInput): Promise<SdkResult<Post>> => {
		parseInput({ schema: idParamSchema, input: { id }, label: "posts.update id" });
		const body = parseInput({
			schema: updatePostSchema,
			input: mergePageOtherOnWrite(input, "update"),
			label: "posts.update input",
		});
		return safeHttpRequest(http, `/api/posts/${id}`, { method: "PUT", body });
	};

	return {
		list: async (params: ListPostsQuery = {}): Promise<PaginatedResponse<Post, "posts">> => {
			const query = parseInput({
				schema: listPostsQuerySchema,
				input: normalizePostsListQuery(params),
				label: "posts.list params",
			});
			return http.request("/api/posts", { query });
		},

		get,

		create: async (input: CreatePostInput): Promise<SdkResult<Post>> => {
			const body = parseInput({
				schema: createPostSchema,
				input: mergePageOtherOnWrite(input, "create"),
				label: "posts.create input",
			});
			return safeHttpRequest(http, "/api/posts", { method: "POST", body });
		},

		update,

		patchBlocks: async ({ id, expectedVersion, ops }: PatchBlocksParams) =>
			runPatchBlocks({
				id,
				expectedVersion,
				ops: ops as BlockPatchOp[],
				get,
				update,
				label: "posts.patchBlocks",
			}),

		delete: async ({ id }: { id: string }): Promise<SdkResult<DeleteMessage>> => {
			parseInput({ schema: idParamSchema, input: { id }, label: "posts.delete id" });
			return safeHttpRequest(http, `/api/posts/${id}`, { method: "DELETE" });
		},
	};
}
