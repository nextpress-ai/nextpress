import { Router } from "express";
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
import type { FeaturedImageMode } from "@shared/import/wordpress/types";

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
		asyncHandler(async (req: { body?: { siteUrl?: string }; user?: { id?: string } }, res) => {
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

			if (err) {
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

			if (err) {
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
		asyncHandler(async (req: {
			body?: {
				baseUrl?: string;
				blogId?: string;
				wpIds?: number[];
				featuredImageMode?: FeaturedImageMode;
			};
		}, res) => {
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
				});

				await models.media.create({
					...mediaData,
					filename: String(mediaData.filename),
					originalName: String(mediaData.originalName),
					mimeType: String(mediaData.mimeType),
					size: Number(mediaData.size),
					url: String(mediaData.url),
					authorId: String(mediaData.authorId),
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
				}),
			);

			if (err) {
				console.error("WordPress import error:", err);
				return res.status(500).json({ message: "Import failed" });
			}

			const enrichedImported = await Promise.all(
				result.imported.map(async (item) => {
					const post = await models.posts.findById(item.postId);
					return {
						...item,
						post: post ? enrichPostForApi(post) : undefined,
					};
				}),
			);

			res.json({ ...result, imported: enrichedImported });
		}),
	);

	return router;
}
