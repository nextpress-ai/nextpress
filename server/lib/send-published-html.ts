import type { Response } from "express";
import { documentHasBlockName } from "@shared/bind-post-blocks";
import type { BlockConfig } from "@shared/schema-types";
import type { Deps } from "../routes/shared/deps";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";
import { resolveSiteThemeSettings } from "../routes/shared/resolve-site-theme-settings";
import { bindPublishedPostLists } from "./bind-published-post-lists";
import { canonicalUrlWithoutQuery, publishedPageCache, publishedPageCacheKey } from "./published-page-cache";
import {
	preparePublishedPost,
	type PublishedContentRow,
} from "./prepare-published-post";

/**
 * These blocks are filled from other records when the HTML is built.
 * A new comment, a new post, or a renamed author does not raise this document's version.
 */
const LIVE_BLOCK_NAMES = ["post/list", "post/comments", "post/navigation", "post/author-box"] as const;

const canCacheBlocks = (blocks: BlockConfig[]): boolean =>
	!LIVE_BLOCK_NAMES.some((name) => documentHasBlockName({ blocks, name }));

/**
 * Bind the document (author, comments, adjacent) then send SSR HTML.
 * Used by every public HTML route so page and post URLs cannot drift.
 */
export async function sendPublishedHtml({
	res,
	models,
	document,
	canonicalUrl,
	siteId: siteIdHint,
}: {
	res: Response;
	models: Deps["models"];
	document: PublishedContentRow & { siteId?: string | null; blogId?: string | null; version?: number };
	canonicalUrl: string;
	siteId?: string;
}): Promise<void> {
	const storedBlocks = (Array.isArray(document.blocks) ? document.blocks : []) as BlockConfig[];
	const version = typeof document.version === "number" ? document.version : 0;
	const cacheable = canCacheBlocks(storedBlocks);
	const stableCanonical = canonicalUrlWithoutQuery(canonicalUrl);

	let siteId = siteIdHint ?? document.siteId ?? undefined;
	if (!siteId && document.blogId && models.blogs?.findById) {
		const blog = await models.blogs.findById(document.blogId);
		siteId = blog?.siteId ?? undefined;
	}

	const theme = siteId
		? await resolveSiteThemeSettings({ models, siteId })
		: null;

	const cacheKey = publishedPageCacheKey({
		documentId: document.id,
		version,
		canonicalUrl: stableCanonical,
		themeId: theme?.themeId ?? null,
		themeSettingsJson: JSON.stringify(theme?.rawSettings ?? null),
	});
	if (cacheable) {
		const cached = publishedPageCache.read(cacheKey);
		if (cached) {
			res.setHeader("Content-Type", "text/html");
			res.setHeader("X-Nextpress-Cache", "hit");
			res.send(cached);
			return;
		}
	}

	const prepared = await preparePublishedPost({ models, post: document });

	const blocks = siteId
		? await bindPublishedPostLists({
				models,
				siteId,
				blocks: prepared.blocks,
			})
		: prepared.blocks;

	const html = buildPublishedPageHtml({
		page: {
			id: document.id,
			title: document.title,
			blocks,
			other: document.other,
		},
		canonicalUrl: stableCanonical,
		post: prepared.post,
		themeSettings: theme?.settings,
		themeRawSettings: theme?.rawSettings,
	});
	if (cacheable) {
		publishedPageCache.write(cacheKey, html);
	}
	res.setHeader("Content-Type", "text/html");
	res.setHeader("X-Nextpress-Cache", cacheable ? "miss" : "skip");
	res.send(html);
}
