import { Router } from "express";
import type { Deps } from "./shared/deps";
import { asyncHandler } from "./shared/async-handler";
import { safeTryAsync } from "../utils";
import { resolveReadSiteId } from "../lib/content-access";
import { getSiteBlogIds } from "./shared/site-content";
import { countTaxonomyTerms, type TaxonomyTerm } from "@shared/posts/taxonomy";
import type { Filter } from "@shared/create-models";

/** Posts read in one go when counting terms. */
const POSTS_PER_READ = 200;
/** Reads stop here, so one very large site cannot hold a request open. */
const MAX_POSTS = 5000;

type TaxonomyKind = "categories" | "tags";

/**
 * The posts of a site that a reader may use to build a category or tag list. Only published posts
 * count: a draft's half-typed category is not something a visitor should see.
 */
async function readPublishedPosts({ models, siteId, publishedStatus }: { models: Deps["models"]; siteId: string; publishedStatus: string }): Promise<{ other?: unknown; categories?: string[] | null; tags?: string[] | null }[]> {
	const blogIds = await getSiteBlogIds({ models, siteId });
	if (blogIds.length === 0) return [];
	const filters: Filter[] = [
		{ where: "blogId", in: blogIds },
		{ where: "status", equals: publishedStatus },
	];

	const posts: { other?: unknown; categories?: string[] | null; tags?: string[] | null }[] = [];
	for (let offset = 0; offset < MAX_POSTS; offset += POSTS_PER_READ) {
		const batch = await models.posts.findManyWhere(filters, { limit: POSTS_PER_READ, offset });
		posts.push(...batch);
		if (batch.length < POSTS_PER_READ) break;
	}
	return posts;
}

/**
 * Category and tag lists, derived from the posts themselves (they live in `posts.other`, not in a
 * table). Read-only: posts are the place these names are written. Mounted at `/api/categories` and
 * `/api/tags` so the SDK and agents can list them the way they list posts.
 */
export function createTaxonomyRoutes(deps: Deps): Router {
	const router = Router();
	const { models, CONFIG } = deps;

	const list = (kind: TaxonomyKind) =>
		asyncHandler(async (req, res) => {
			const { err, result } = await safeTryAsync(async () => {
				const requestedSiteId = typeof req.query.siteId === "string" && req.query.siteId.trim() ? req.query.siteId.trim() : undefined;
				const siteId = await resolveReadSiteId({ req, models, requestedSiteId });
				if (!siteId) return [] as TaxonomyTerm[];
				const posts = await readPublishedPosts({ models, siteId, publishedStatus: CONFIG.STATUS.PUBLISH });
				return countTaxonomyTerms({ posts, field: kind });
			});

			if (err) {
				console.error({ atFunction: `taxonomy.list.${kind}`, data: { siteId: req.query.siteId ?? null, error: err }, message: "Could not list categories and tags" });
				return res.status(500).json({ message: "Couldn't load the list right now. Try again in a moment." });
			}
			res.json(result);
		});

	router.get("/categories", list("categories"));
	router.get("/tags", list("tags"));

	return router;
}
