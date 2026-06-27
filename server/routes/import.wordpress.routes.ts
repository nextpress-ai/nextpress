import { Router, type Request, type Response } from "express";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { safeTryAsync } from "../utils";
import { validateExternalUrl } from "../utils/validate-external-url";
import { sideloadRemoteImage } from "../utils/sideload-remote-image";
import { enrichPostForApi } from "@shared/posts/post-other";
import {
	createWordPressImporter,
	fetchWpFeaturedImageUrl,
} from "@shared/import/wordpress/create-wordpress-importer";
import { buildImportedWpMap } from "@shared/import/wordpress/build-imported-wp-map";
import type { FeaturedImageMode } from "@shared/import/wordpress/types";
import { resolveRequestSite } from "./shared/resolve-request-site";

const importer = createWordPressImporter();

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (params: {
	key: string;
	limit: number;
	windowMs: number;
}): boolean => {
	const now = Date.now();
	const bucket = rateBuckets.get(params.key);

	if (!bucket || now > bucket.resetAt) {
		rateBuckets.set(params.key, { count: 1, resetAt: now + params.windowMs });
		return true;
	}

	if (bucket.count >= params.limit) return false;
	bucket.count += 1;
	return true;
};

const parseFeaturedImageMode = (value: unknown): FeaturedImageMode =>
	value === "copy" ? "copy" : "reference";

/**
 * WordPress import routes — server-side WP REST proxy with SSRF protection.
 *
 * POST /api/import/wordpress/discover
 * GET  /api/import/wordpress/posts
 * POST /api/import/wordpress/posts
 */
export function createWordPressImportRoutes(deps: Deps): Router {
	const router = Router();
	const { requireAuth, authService, models, schemas, CONFIG, uploadDir } = deps;

	router.post(
		"/discover",
		requireAuth,
		asyncHandler(async (req: Request, res: Response) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			if (!checkRateLimit({ key: `discover:${userId}`, limit: 10, windowMs: 60_000 })) {
				return res.status(429).json({ message: "Too many discovery attempts. Try again shortly." });
			}

			const siteUrl = req.body?.siteUrl;
			if (!siteUrl || typeof siteUrl !== "string") {
				return res.status(400).json({ message: "siteUrl is required" });
			}

			const validated = await validateExternalUrl(siteUrl);
			if (!validated.ok) {
				return res.status(400).json({ message: validated.message });
			}

	const pathname = validated.url.pathname.replace(/\/+$/, "");
	const normalizedBaseUrl = `${validated.url.origin}${pathname}`;

			const { err, result } = await safeTryAsync(async () =>
				importer.discoverSite({ siteUrl: normalizedBaseUrl }),
			);

			if (err || !result) {
				console.error("WordPress discover error:", err);
				return res.status(500).json({ message: "Discovery failed" });
			}

			res.json(result);
		}),
	);

	router.get(
		"/posts",
		requireAuth,
		asyncHandler(async (req, res) => {
			const baseUrl = req.query.baseUrl;
			const page = Number.parseInt(String(req.query.page ?? "1"), 10) || 1;
			const perPage = Math.min(
				Number.parseInt(String(req.query.per_page ?? "20"), 10) || 20,
				50,
			);

			if (!baseUrl || typeof baseUrl !== "string") {
				return res.status(400).json({ message: "baseUrl is required" });
			}

			const validated = await validateExternalUrl(baseUrl);
			if (!validated.ok) {
				return res.status(400).json({ message: validated.message });
			}

			const pathname = validated.url.pathname.replace(/\/+$/, "");
			const normalizedBaseUrl = `${validated.url.origin}${pathname}`;

			const { err, result } = await safeTryAsync(async () =>
				importer.listPosts({
					baseUrl: normalizedBaseUrl,
					page,
					perPage,
				}),
			);

			if (err || !result) {
				console.error("WordPress list error:", err);
				return res.status(502).json({ message: "Failed to list WordPress posts" });
			}

			res.json({
				items: result.items,
				total: result.total,
				page: result.page,
				per_page: result.perPage,
				total_pages: result.totalPages,
			});
		}),
	);

	router.post(
		"/posts",
		requireAuth,
		asyncHandler(async (req: Request, res: Response) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			if (!checkRateLimit({ key: `import:${userId}`, limit: 5, windowMs: 60_000 })) {
				return res.status(429).json({ message: "Import rate limit exceeded. Try again shortly." });
			}

			const { baseUrl, blogId, wpIds, featuredImageMode: modeInput } = req.body ?? {};

			if (!baseUrl || typeof baseUrl !== "string") {
				return res.status(400).json({ message: "baseUrl is required" });
			}
			if (!blogId || typeof blogId !== "string") {
				return res.status(400).json({ message: "blogId is required" });
			}
			if (!Array.isArray(wpIds) || wpIds.length === 0) {
				return res.status(400).json({ message: "wpIds must be a non-empty array" });
			}
			if (wpIds.length > 50) {
				return res.status(400).json({ message: "Maximum 50 posts per import batch" });
			}

			const validated = await validateExternalUrl(baseUrl);
			if (!validated.ok) {
				return res.status(400).json({ message: validated.message });
			}

			const pathname = validated.url.pathname.replace(/\/+$/, "");
			const normalizedBaseUrl = `${validated.url.origin}${pathname}`;

			const featuredImageMode = parseFeaturedImageMode(modeInput);

			const blog = await models.blogs.findById(blogId);
			if (!blog) {
				return res.status(400).json({ message: "Blog not found" });
			}

			const existingPosts = await models.posts.findMany({ limit: 5000 });

			/** Downloads a remote image into uploads + records it as media. */
			const sideloadAndRecord = async (
				remoteUrl: string,
			): Promise<string> => {
				const sideloaded = await sideloadRemoteImage({
					imageUrl: remoteUrl,
					uploadDir,
					allowedMimeTypes: CONFIG.UPLOAD.ALLOWED_MIME_TYPES,
					maxSize: CONFIG.UPLOAD.LIMIT,
				});

				if (!sideloaded.ok) return remoteUrl;

				const mediaData = schemas.media.insert.parse({
					filename: sideloaded.filename,
					originalName: sideloaded.originalName,
					mimeType: sideloaded.mimeType,
					size: sideloaded.size,
					url: sideloaded.url,
					authorId: userId,
					siteId: blog.siteId ? String(blog.siteId) : String((await models.sites.findDefaultSite())?.id ?? ""),
				});

				await models.media.create({
					...mediaData,
					filename: String(mediaData.filename),
					originalName: String(mediaData.originalName),
					mimeType: String(mediaData.mimeType),
					size: Number(mediaData.size),
					url: String(mediaData.url),
					authorId: String(mediaData.authorId),
					siteId: String(mediaData.siteId),
				});

				return sideloaded.url;
			};

			const resolveFeaturedImage = async (params: {
				featuredMediaId: number;
			}): Promise<string | null> => {
				const remoteUrl = await fetchWpFeaturedImageUrl({
					baseUrl: normalizedBaseUrl,
					featuredMediaId: params.featuredMediaId,
				});
				if (!remoteUrl) return null;
				if (featuredImageMode === "reference") return remoteUrl;
				return sideloadAndRecord(remoteUrl);
			};

			/**
			 * Resolves inline content images. In reference mode we keep the remote
			 * URL (null = no change). In copy mode we SSRF-validate then sideload.
			 */
			const resolveContentImage = async (params: {
				imageUrl: string;
			}): Promise<string | null> => {
				if (featuredImageMode === "reference") return null;
				const validated = await validateExternalUrl(params.imageUrl);
				if (!validated.ok) return null;
				return sideloadAndRecord(params.imageUrl);
			};

			const { err, result } = await safeTryAsync(async () =>
				importer.importPosts({
					baseUrl: normalizedBaseUrl,
					blogId,
					authorId: userId,
					wpIds: wpIds.filter((id): id is number => typeof id === "number"),
					featuredImageMode,
					existingPosts,
					resolveFeaturedImage,
					resolveContentImage,
					createPost: async (data) => {
						const parsed = schemas.posts.insert.parse(data);
						const post = await models.posts.create({
							...parsed,
							title: String(parsed.title),
							slug: String(parsed.slug),
							authorId: String(parsed.authorId),
						});
						deps.hooks.doAction("save_post", post);
						if (post.status === CONFIG.STATUS.PUBLISH) {
							deps.hooks.doAction("publish_post", post);
						}
						return { id: post.id, title: post.title };
					},
					updatePost: async ({ postId, data }) => {
						const parsed = schemas.posts.update.parse(data);
						const post = await models.posts.update(postId, {
							...parsed,
							title: String(parsed.title ?? ""),
							slug: String(parsed.slug ?? ""),
						});
						if (!post) throw new Error("Post not found");
						deps.hooks.doAction("save_post", post);
						if (post.status === CONFIG.STATUS.PUBLISH) {
							deps.hooks.doAction("publish_post", post);
						}
						return { id: post.id, title: post.title };
					},
				}),
			);

			if (err || !result) {
				console.error("WordPress import error:", err);
				return res.status(500).json({ message: "Import failed" });
			}

			const enrichPost = async (item: { postId: string }) => {
				const post = await models.posts.findById(item.postId);
				return post ? enrichPostForApi(post) : undefined;
			};

			const enrichedImported = await Promise.all(
				result.imported.map(async (item) => ({
					...item,
					post: await enrichPost(item),
				})),
			);

			const enrichedUpdated = await Promise.all(
				(result.updated ?? []).map(async (item) => ({
					...item,
					post: await enrichPost(item),
				})),
			);

			res.json({ ...result, imported: enrichedImported, updated: enrichedUpdated });
		}),
	);

	router.get(
		"/status",
		requireAuth,
		asyncHandler(async (req, res) => {
			const baseUrl = req.query.baseUrl;
			const entity = req.query.entity;

			if (!baseUrl || typeof baseUrl !== "string") {
				return res.status(400).json({ message: "baseUrl is required" });
			}
			if (entity !== "posts" && entity !== "pages") {
				return res.status(400).json({ message: "entity must be posts or pages" });
			}

			const validated = await validateExternalUrl(baseUrl);
			if (!validated.ok) {
				return res.status(400).json({ message: validated.message });
			}

			const pathname = validated.url.pathname.replace(/\/+$/, "");
			const normalizedBaseUrl = `${validated.url.origin}${pathname}`;

			const items =
				entity === "posts"
					? await models.posts.findMany({ limit: 5000 })
					: await models.pages.findMany({ limit: 5000 });

			const importedMap = buildImportedWpMap({
				items,
				domain: normalizedBaseUrl,
			});

			const imported: Record<string, { nextpressId: string }> = {};
			importedMap.forEach((entry, wpId) => {
				imported[String(wpId)] = entry;
			});

			res.json({ imported });
		}),
	);

	router.get(
		"/pages",
		requireAuth,
		asyncHandler(async (req, res) => {
			const baseUrl = req.query.baseUrl;
			const page = Number.parseInt(String(req.query.page ?? "1"), 10) || 1;
			const perPage = Math.min(
				Number.parseInt(String(req.query.per_page ?? "20"), 10) || 20,
				50,
			);

			if (!baseUrl || typeof baseUrl !== "string") {
				return res.status(400).json({ message: "baseUrl is required" });
			}

			const validated = await validateExternalUrl(baseUrl);
			if (!validated.ok) {
				return res.status(400).json({ message: validated.message });
			}

			const pathname = validated.url.pathname.replace(/\/+$/, "");
			const normalizedBaseUrl = `${validated.url.origin}${pathname}`;

			const { err, result } = await safeTryAsync(async () =>
				importer.listPages({
					baseUrl: normalizedBaseUrl,
					page,
					perPage,
				}),
			);

			if (err || !result) {
				console.error("WordPress pages list error:", err);
				return res.status(502).json({ message: "Failed to list WordPress pages" });
			}

			res.json({
				items: result.items,
				total: result.total,
				page: result.page,
				per_page: result.perPage,
				total_pages: result.totalPages,
			});
		}),
	);

	router.post(
		"/pages",
		requireAuth,
		asyncHandler(async (req: Request, res: Response) => {
			const userId = authService.getCurrentUserId(req);
			if (!userId) return res.status(401).json({ message: "Unauthorized" });

			if (!checkRateLimit({ key: `import-pages:${userId}`, limit: 5, windowMs: 60_000 })) {
				return res.status(429).json({ message: "Import rate limit exceeded. Try again shortly." });
			}

			const { baseUrl, siteId: siteIdInput, wpIds, featuredImageMode: modeInput } = req.body ?? {};

			if (!baseUrl || typeof baseUrl !== "string") {
				return res.status(400).json({ message: "baseUrl is required" });
			}
			if (!Array.isArray(wpIds) || wpIds.length === 0) {
				return res.status(400).json({ message: "wpIds must be a non-empty array" });
			}
			if (wpIds.length > 50) {
				return res.status(400).json({ message: "Maximum 50 pages per import batch" });
			}

			const validated = await validateExternalUrl(baseUrl);
			if (!validated.ok) {
				return res.status(400).json({ message: validated.message });
			}

			const pathname = validated.url.pathname.replace(/\/+$/, "");
			const normalizedBaseUrl = `${validated.url.origin}${pathname}`;
			const featuredImageMode = parseFeaturedImageMode(modeInput);

			let siteId = typeof siteIdInput === "string" ? siteIdInput : "";
			if (!siteId) {
				const defaultSite = await models.sites.findDefaultSite();
				if (!defaultSite?.id) {
					return res.status(400).json({ message: "No site found" });
				}
				siteId = String(defaultSite.id);
			}

			try {
				await resolveRequestSite({ models, userId, siteId });
			} catch {
				return res.status(403).json({ message: "Site not accessible" });
			}

			const site = await models.sites.findById(siteId);
			if (!site) {
				return res.status(400).json({ message: "Site not found" });
			}

			const existingPages = await models.pages.findMany({ limit: 5000 });

			const sideloadAndRecord = async (remoteUrl: string): Promise<string> => {
				const sideloaded = await sideloadRemoteImage({
					imageUrl: remoteUrl,
					uploadDir,
					allowedMimeTypes: CONFIG.UPLOAD.ALLOWED_MIME_TYPES,
					maxSize: CONFIG.UPLOAD.LIMIT,
				});
				if (!sideloaded.ok) return remoteUrl;
				const mediaData = schemas.media.insert.parse({
					filename: sideloaded.filename,
					originalName: sideloaded.originalName,
					mimeType: sideloaded.mimeType,
					size: sideloaded.size,
					url: sideloaded.url,
					authorId: userId,
					siteId,
				});
				await models.media.create({
					...mediaData,
					filename: String(mediaData.filename),
					originalName: String(mediaData.originalName),
					mimeType: String(mediaData.mimeType),
					size: Number(mediaData.size),
					url: String(mediaData.url),
					authorId: String(mediaData.authorId),
					siteId: String(mediaData.siteId),
				});
				return sideloaded.url;
			};

			const resolveFeaturedImage = async (params: { featuredMediaId: number }) => {
				const remoteUrl = await fetchWpFeaturedImageUrl({
					baseUrl: normalizedBaseUrl,
					featuredMediaId: params.featuredMediaId,
				});
				if (!remoteUrl) return null;
				if (featuredImageMode === "reference") return remoteUrl;
				return sideloadAndRecord(remoteUrl);
			};

			const resolveContentImage = async (params: { imageUrl: string }) => {
				if (featuredImageMode === "reference") return null;
				const imageValidated = await validateExternalUrl(params.imageUrl);
				if (!imageValidated.ok) return null;
				return sideloadAndRecord(params.imageUrl);
			};

			const { err, result } = await safeTryAsync(async () =>
				importer.importPages({
					baseUrl: normalizedBaseUrl,
					siteId,
					authorId: userId,
					wpIds: wpIds.filter((id): id is number => typeof id === "number"),
					featuredImageMode,
					existingPages,
					resolveFeaturedImage,
					resolveContentImage,
					createPage: async (data) => {
						const parsed = schemas.pages.insert.parse(data);
						const page = await models.pages.create({
							...parsed,
							title: String(parsed.title),
							slug: String(parsed.slug),
							siteId: String(parsed.siteId),
							authorId: String(parsed.authorId),
						});
						deps.hooks.doAction("save_post", page);
						if (page.status === CONFIG.STATUS.PUBLISH) {
							deps.hooks.doAction("publish_post", page);
						}
						return { id: page.id, title: page.title };
					},
					updatePage: async ({ pageId, data }) => {
						const parsed = schemas.pages.update.parse(data);
						const page = await models.pages.update(pageId, {
							...parsed,
							title: String(parsed.title ?? ""),
							slug: String(parsed.slug ?? ""),
						});
						if (!page) throw new Error("Page not found");
						deps.hooks.doAction("save_post", page);
						if (page.status === CONFIG.STATUS.PUBLISH) {
							deps.hooks.doAction("publish_post", page);
						}
						return { id: page.id, title: page.title };
					},
				}),
			);

			if (err || !result) {
				console.error("WordPress page import error:", err);
				return res.status(500).json({ message: "Import failed" });
			}

			res.json(result);
		}),
	);

	return router;
}
