import { parsePostOther } from "../../posts/post-other";
import {
	createPostsAdapter,
	discoverWordPressSite,
	fetchWpFeaturedImageUrl,
	fetchWpTermMaps,
} from "./adapters/posts-adapter";
import type {
	FeaturedImageMode,
	ImportBatchResult,
	ImportContext,
	ImportItemResult,
	MappedPost,
	WordPressEntity,
} from "./types";

const IMPORT_DELAY_MS = 150;

const delay = (ms: number): Promise<void> =>
	new Promise((resolve) => setTimeout(resolve, ms));

const collectExistingWpIds = (params: {
	posts: Array<{ other: unknown }>;
	domain: string;
}): Set<number> => {
	const ids = new Set<number>();
	params.posts.forEach((post) => {
		const parsed = parsePostOther(post.other);
		if (parsed.import?.source === "wordpress" && parsed.import.domain === params.domain) {
			ids.add(parsed.import.wpId);
		}
	});
	return ids;
};

export type WordPressImporter = {
	discoverSite: typeof discoverWordPressSite;
	listPosts: ReturnType<typeof createPostsAdapter>["list"];
	importPosts: (params: {
		baseUrl: string;
		blogId: string;
		authorId: string;
		wpIds: number[];
		featuredImageMode: FeaturedImageMode;
		existingPosts: Array<{ other: unknown }>;
		resolveFeaturedImage: ImportContext["resolveFeaturedImage"];
		resolveContentImage?: ImportContext["resolveContentImage"];
		createPost: (data: MappedPost) => Promise<{ id: string; title: string }>;
	}) => Promise<ImportBatchResult>;
	getSupportedEntities: () => WordPressEntity[];
};

/**
 * Factory for WordPress import operations. Each entity has an adapter;
 * only posts is implemented in phase 1.
 */
export const createWordPressImporter = (): WordPressImporter => {
	const postsAdapter = createPostsAdapter();

	return {
		discoverSite: discoverWordPressSite,
		listPosts: postsAdapter.list,
		getSupportedEntities: () => ["posts"],

		importPosts: async (params) => {
			const {
				baseUrl,
				blogId,
				authorId,
				wpIds,
				featuredImageMode,
				existingPosts,
				resolveFeaturedImage,
				resolveContentImage,
				createPost,
			} = params;

			const { categoryNames, tagNames } = await fetchWpTermMaps({ baseUrl });
			const existingWpIds = collectExistingWpIds({
				posts: existingPosts,
				domain: baseUrl,
			});

			const ctx: ImportContext = {
				baseUrl,
				blogId,
				authorId,
				featuredImageMode,
				categoryNames,
				tagNames,
				existingWpIds,
				resolveFeaturedImage,
				resolveContentImage,
			};

			const imported: ImportBatchResult["imported"] = [];
			const skipped: ImportBatchResult["skipped"] = [];
			const failed: ImportBatchResult["failed"] = [];

			for (const wpId of wpIds) {
				if (existingWpIds.has(wpId)) {
					const item: ImportItemResult = {
						wpId,
						status: "skipped",
						reason: "Already imported from this site",
					};
					skipped.push(item);
					continue;
				}

				try {
					const raw = await postsAdapter.fetchOne({ baseUrl, wpId });
					const mapped = await postsAdapter.map({ raw, ctx });
					const created = await createPost(mapped);
					existingWpIds.add(wpId);

					imported.push({
						wpId,
						status: "imported",
						postId: created.id,
						title: created.title,
					});
				} catch (err: unknown) {
					failed.push({
						wpId,
						status: "failed",
						reason: err instanceof Error ? err.message : "Import failed",
					});
				}

				await delay(IMPORT_DELAY_MS);
			}

			return { imported, skipped, failed };
		},
	};
};

export { fetchWpFeaturedImageUrl };
