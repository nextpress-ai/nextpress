import {
	createPostsAdapter,
	discoverWordPressSite,
	fetchWpTermMaps,
	fetchWpFeaturedImageUrl,
} from "./adapters/posts-adapter";
import { createPagesAdapter } from "./adapters/pages-adapter";
import type {
	FeaturedImageMode,
	ImportBatchResult,
	ImportContext,
	MappedPost,
	WordPressEntity,
} from "./types";
import type { MappedPage } from "./map-wp-page";
import { parsePostOther } from "../../posts/post-other";

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

/** Maps WordPress wpId → NextPress post id for re-import updates. */
const buildExistingPostIdByWpId = (params: {
	posts: Array<{ id: string; other: unknown }>;
	domain: string;
}): Map<number, string> => {
	const map = new Map<number, string>();
	params.posts.forEach((post) => {
		const parsed = parsePostOther(post.other);
		if (parsed.import?.source === "wordpress" && parsed.import.domain === params.domain) {
			map.set(parsed.import.wpId, post.id);
		}
	});
	return map;
};

export type WordPressImporter = {
	discoverSite: typeof discoverWordPressSite;
	listPosts: ReturnType<typeof createPostsAdapter>["list"];
	listPages: ReturnType<typeof createPagesAdapter>["list"];
	importPosts: (params: {
		baseUrl: string;
		blogId: string;
		authorId: string;
		wpIds: number[];
		featuredImageMode: FeaturedImageMode;
		existingPosts: Array<{ id: string; other: unknown }>;
		resolveFeaturedImage: ImportContext["resolveFeaturedImage"];
		resolveContentImage?: ImportContext["resolveContentImage"];
		createPost: (data: MappedPost) => Promise<{ id: string; title: string }>;
		updatePost?: (params: {
			postId: string;
			data: MappedPost;
		}) => Promise<{ id: string; title: string }>;
	}) => Promise<ImportBatchResult>;
	importPages: (params: {
		baseUrl: string;
		siteId: string;
		authorId: string;
		wpIds: number[];
		featuredImageMode: FeaturedImageMode;
		existingPages: Array<{ id: string; other: unknown }>;
		resolveFeaturedImage: ImportContext["resolveFeaturedImage"];
		resolveContentImage?: ImportContext["resolveContentImage"];
		createPage: (data: MappedPage) => Promise<{ id: string; title: string }>;
		updatePage?: (params: {
			pageId: string;
			data: MappedPage;
		}) => Promise<{ id: string; title: string }>;
	}) => Promise<ImportBatchResult>;
	getSupportedEntities: () => WordPressEntity[];
};

/**
 * Factory for WordPress import operations. Each entity has an adapter;
 * only posts is implemented in phase 1.
 */
export const createWordPressImporter = (): WordPressImporter => {
	const postsAdapter = createPostsAdapter();
	const pagesAdapter = createPagesAdapter();

	return {
		discoverSite: discoverWordPressSite,
		listPosts: postsAdapter.list,
		listPages: pagesAdapter.list,
		getSupportedEntities: () => ["posts", "pages"],

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
				updatePost,
			} = params;

			const { categoryNames, tagNames } = await fetchWpTermMaps({ baseUrl });
			const existingWpIds = collectExistingWpIds({
				posts: existingPosts,
				domain: baseUrl,
			});
			const existingPostIdByWpId = buildExistingPostIdByWpId({
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
			const updated: ImportBatchResult["updated"] = [];
			const skipped: ImportBatchResult["skipped"] = [];
			const failed: ImportBatchResult["failed"] = [];

			for (const wpId of wpIds) {
				const existingPostId = existingPostIdByWpId.get(wpId);

				try {
					const raw = await postsAdapter.fetchOne({ baseUrl, wpId });
					const mapped = await postsAdapter.map({
						raw,
						ctx: { ...ctx, updatingExisting: !!existingPostId },
					});

					if (existingPostId && updatePost) {
						const saved = await updatePost({ postId: existingPostId, data: mapped });
						updated.push({
							wpId,
							status: "updated",
							postId: saved.id,
							title: saved.title,
						});
					} else if (existingPostId) {
						skipped.push({
							wpId,
							status: "skipped",
							reason: "Already imported from this site",
						});
						continue;
					} else {
						const created = await createPost(mapped);
						existingWpIds.add(wpId);
						existingPostIdByWpId.set(wpId, created.id);

						imported.push({
							wpId,
							status: "imported",
							postId: created.id,
							title: created.title,
						});
					}
				} catch (err: unknown) {
					failed.push({
						wpId,
						status: "failed",
						reason: err instanceof Error ? err.message : "Import failed",
					});
				}

				await delay(IMPORT_DELAY_MS);
			}

			return { imported, updated, skipped, failed };
		},

		importPages: async (params) => {
			const {
				baseUrl,
				siteId,
				authorId,
				wpIds,
				featuredImageMode,
				existingPages,
				resolveFeaturedImage,
				resolveContentImage,
				createPage,
				updatePage,
			} = params;

			const { categoryNames, tagNames } = await fetchWpTermMaps({ baseUrl });
			const existingWpIds = collectExistingWpIds({
				posts: existingPages,
				domain: baseUrl,
			});
			const existingPageIdByWpId = buildExistingPostIdByWpId({
				posts: existingPages,
				domain: baseUrl,
			});

			const imported: ImportBatchResult["imported"] = [];
			const updated: ImportBatchResult["updated"] = [];
			const skipped: ImportBatchResult["skipped"] = [];
			const failed: ImportBatchResult["failed"] = [];

			for (const wpId of wpIds) {
				const existingPageId = existingPageIdByWpId.get(wpId);

				try {
					const raw = await pagesAdapter.fetchOne({ baseUrl, wpId });
					const mapped = await pagesAdapter.map({
						raw,
						ctx: {
							baseUrl,
							siteId,
							authorId,
							featuredImageMode,
							categoryNames,
							tagNames,
							existingWpIds,
							updatingExisting: !!existingPageId,
							resolveFeaturedImage,
							resolveContentImage,
						},
					});

					if (existingPageId && updatePage) {
						const saved = await updatePage({ pageId: existingPageId, data: mapped });
						updated.push({
							wpId,
							status: "updated",
							postId: saved.id,
							title: saved.title,
						});
					} else if (existingPageId) {
						skipped.push({
							wpId,
							status: "skipped",
							reason: "Already imported from this site",
						});
					} else {
						const created = await createPage(mapped);
						existingWpIds.add(wpId);
						existingPageIdByWpId.set(wpId, created.id);
						imported.push({
							wpId,
							status: "imported",
							postId: created.id,
							title: created.title,
						});
					}
				} catch (err: unknown) {
					failed.push({
						wpId,
						status: "failed",
						reason: err instanceof Error ? err.message : "Import failed",
					});
				}

				await delay(IMPORT_DELAY_MS);
			}

			return { imported, updated, skipped, failed };
		},
	};
};

export { fetchWpFeaturedImageUrl };
