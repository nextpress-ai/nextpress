import { createHash } from "node:crypto";
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
import { parsePageOther } from "@shared/page-other";
import {
	publicSiteDescription,
	publicSiteName,
	publishedCanonicalUrl,
} from "@shared/published-document-meta";

/**
 * These blocks are filled from other records when the HTML is built.
 * A new comment, a new post, or a renamed author does not raise this document's version.
 */
const LIVE_BLOCK_NAMES = ["post/list", "post/comments", "post/navigation", "post/author-box"] as const;

const canCacheBlocks = (blocks: BlockConfig[]): boolean =>
	!LIVE_BLOCK_NAMES.some((name) => documentHasBlockName({ blocks, name }));

/** A published page may be reused by the browser for about a minute. Live pages are not stored. */
const PUBLISHED_CACHE_CONTROL = "public, max-age=60";

const publishedHtmlEtag = (html: string): string => {
	const hash = createHash("sha256").update(html).digest("base64url").slice(0, 22);
	return `W/"${hash}"`;
};

const readIfNoneMatch = (res: Response): string | undefined => {
	const header = res.req?.headers?.["if-none-match"];
	if (Array.isArray(header)) return header.join(", ");
	return header;
};

const ifNoneMatchHits = (header: string | undefined, etag: string): boolean => {
	if (!header) return false;
	if (header.trim() === "*") return true;
	return header.split(",").some((part) => part.trim() === etag);
};

const finishPublishedHtml = ({
	res,
	html,
	cacheable,
	cacheState,
}: {
	res: Response;
	html: string;
	cacheable: boolean;
	cacheState: "hit" | "miss" | "skip";
}): void => {
	const etag = publishedHtmlEtag(html);
	res.setHeader("Content-Type", "text/html; charset=utf-8");
	res.setHeader("ETag", etag);
	res.setHeader("Cache-Control", cacheable ? PUBLISHED_CACHE_CONTROL : "private, no-store");
	res.setHeader("X-Nextpress-Cache", cacheState);
	if (ifNoneMatchHits(readIfNoneMatch(res), etag)) {
		res.status(304);
		res.end();
		return;
	}
	res.send(html);
};

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

	const siteRecord = siteId && typeof models.sites?.findById === "function"
		? await models.sites.findById(siteId)
		: undefined;
	const storedSettings = siteId && typeof models.sites?.getSettings === "function"
		? await models.sites.getSettings(siteId)
		: undefined;
	const siteUrl = storedSettings?.general?.siteUrl || siteRecord?.siteUrl || "";
	const site = {
		name: publicSiteName({
			settingsName: storedSettings?.general?.siteName,
			recordName: siteRecord?.name,
			siteUrl,
		}),
		description: publicSiteDescription(storedSettings?.general?.siteDescription),
		url: siteUrl,
		discourageIndexing: Boolean(storedSettings?.reading?.discourageSearchIndexing),
		descriptionFrom: storedSettings?.reading?.descriptionFrom,
		logoUrl: siteRecord?.logoUrl || "",
	};
	const pageSeo = parsePageOther(document.other).seo;
	const publicCanonical = publishedCanonicalUrl({
		requestUrl: stableCanonical,
		siteUrl: site.url,
		pageCanonical: pageSeo?.canonicalUrl,
	});

	const cacheKey = publishedPageCacheKey({
		documentId: document.id,
		version,
		canonicalUrl: publicCanonical,
		themeId: theme?.themeId ?? null,
		themeSettingsJson: JSON.stringify({
			theme: theme?.rawSettings ?? null,
			site,
		}),
	});
	if (cacheable) {
		const cached = publishedPageCache.read(cacheKey);
		if (cached) {
			finishPublishedHtml({ res, html: cached, cacheable: true, cacheState: "hit" });
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
			excerpt: document.excerpt,
			featuredImage: document.featuredImage,
			blogId: document.blogId,
		},
		canonicalUrl: publicCanonical,
		post: prepared.post,
		themeSettings: theme?.settings,
		themeRawSettings: theme?.rawSettings,
		site,
	});
	if (cacheable) {
		publishedPageCache.write(cacheKey, html);
	}
	finishPublishedHtml({
		res,
		html,
		cacheable,
		cacheState: cacheable ? "miss" : "skip",
	});
}
