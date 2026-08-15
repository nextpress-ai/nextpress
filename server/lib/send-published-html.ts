import type { Response } from "express";
import { buildPublishedPageHtml } from "../routes/shared/build-published-page-html";
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
}: {
	res: Response;
	models: Parameters<typeof preparePublishedPost>[0]["models"];
	document: PublishedContentRow;
	canonicalUrl: string;
}): Promise<void> {
	const prepared = await preparePublishedPost({ models, post: document });
	const html = buildPublishedPageHtml({
		page: {
			id: document.id,
			title: document.title,
			blocks: prepared.blocks,
			other: document.other,
		},
		canonicalUrl,
		post: prepared.post,
	});
	res.setHeader("Content-Type", "text/html");
	res.send(html);
}
