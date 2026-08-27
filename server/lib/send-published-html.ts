import type { Response } from "express";
import type { Deps } from "../routes/shared/deps";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";
import { resolveSiteThemeSettings } from "../routes/shared/resolve-site-theme-settings";
import {
	preparePublishedPost,
	type PublishedContentRow,
} from "./prepare-published-post";

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
	document: PublishedContentRow & { siteId?: string | null; blogId?: string | null };
	canonicalUrl: string;
	siteId?: string;
}): Promise<void> {
	const prepared = await preparePublishedPost({ models, post: document });

	let siteId = siteIdHint ?? document.siteId ?? undefined;
	if (!siteId && document.blogId && models.blogs?.findById) {
		const blog = await models.blogs.findById(document.blogId);
		siteId = blog?.siteId ?? undefined;
	}

	const theme = siteId
		? await resolveSiteThemeSettings({ models, siteId })
		: null;

	const html = buildPublishedPageHtml({
		page: {
			id: document.id,
			title: document.title,
			blocks: prepared.blocks,
			other: document.other,
		},
		canonicalUrl,
		post: prepared.post,
		themeSettings: theme?.settings,
		themeRawSettings: theme?.rawSettings,
	});
	res.setHeader("Content-Type", "text/html");
	res.send(html);
}
