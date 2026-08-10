import type { Request, Response } from "express";
import type { Deps } from "../routes/shared/deps";
import { resolveAccessibleSites } from "../routes/shared/resolve-accessible-sites";
import {
	attachRequestAuth,
	getRequestAuthSiteId,
	getRequestAuthUserId,
	resolveRequestAuth,
} from "../auth";

export class ContentAccessError extends Error {
	statusCode: number;

	constructor(message: string, statusCode = 403) {
		super(message);
		this.statusCode = statusCode;
	}
}

/** Published content is public; everything else needs auth + site access. */
export const isPublicContentStatus = (status: string | undefined | null): boolean =>
	status === "publish";

/** Ensures the authenticated principal may access content on the given site. */
export async function assertSiteContentAccess({
	models,
	userId,
	siteId,
	apiKeySiteId,
}: {
	models: Deps["models"];
	userId: string;
	siteId: string;
	apiKeySiteId?: string;
}): Promise<void> {
	if (apiKeySiteId && apiKeySiteId !== siteId) {
		throw new ContentAccessError("This API key cannot access content on this site");
	}

	const accessible = await resolveAccessibleSites({ models, userId });
	if (!accessible.some((site) => site.id === siteId)) {
		throw new ContentAccessError("You do not have access to this content");
	}
}

/** Resolves the site ID for a page, post, or template preview target. */
export async function resolveContentSiteId({
	models,
	contentType,
	contentId,
}: {
	models: Deps["models"];
	contentType: "page" | "post" | "template";
	contentId: string;
}): Promise<string | null> {
	if (contentType === "page") {
		const page = await models.pages.findById(contentId);
		return page?.siteId ? String(page.siteId) : null;
	}

	if (contentType === "post") {
		const post = await models.posts.findById(contentId);
		if (!post?.blogId) {
			return null;
		}
		const blog = await models.blogs.findById(String(post.blogId));
		return blog?.siteId ? String(blog.siteId) : null;
	}

	return null;
}

/** Verifies preview-token minting is allowed for this content. */
export async function assertPreviewContentAccess({
	models,
	userId,
	apiKeySiteId,
	contentType,
	contentId,
}: {
	models: Deps["models"];
	userId: string;
	apiKeySiteId?: string;
	contentType: "page" | "post" | "template";
	contentId: string;
}): Promise<void> {
	if (contentType === "template") {
		const template = await models.templates.findById(contentId);
		if (!template) {
			throw new ContentAccessError("Content not found", 404);
		}
		if (String(template.authorId) === userId) {
			return;
		}
		const accessible = await resolveAccessibleSites({ models, userId });
		if (accessible.length === 0) {
			throw new ContentAccessError("You do not have access to this template");
		}
		return;
	}

	const siteId = await resolveContentSiteId({ models, contentType, contentId });
	if (!siteId) {
		throw new ContentAccessError("Content not found", 404);
	}

	await assertSiteContentAccess({ models, userId, siteId, apiKeySiteId });
}

/**
 * For GET handlers: returns false and sends 401/403 when non-public content
 * requires auth the caller does not have.
 */
export async function ensureNonPublicContentAccess({
	req,
	res,
	models,
	siteId,
	status,
}: {
	req: Request;
	res: Response;
	models: Deps["models"];
	siteId: string;
	status: string | undefined | null;
}): Promise<boolean> {
	if (isPublicContentStatus(status)) {
		return true;
	}

	const authContext = await resolveRequestAuth(req);
	if (!authContext) {
		res.status(401).json({ message: "Unauthorized" });
		return false;
	}

	attachRequestAuth(req, authContext);

	try {
		await assertSiteContentAccess({
			models,
			userId: authContext.userId,
			siteId,
			apiKeySiteId: authContext.siteId,
		});
	} catch (error) {
		if (error instanceof ContentAccessError) {
			res.status(error.statusCode).json({ message: error.message });
			return false;
		}
		throw error;
	}

	return true;
}

/** True when list filters expose non-public content and need auth. */
export const listQueryRequiresAuth = (status: string | undefined): boolean => {
	const normalized = (status ?? "publish").toLowerCase();
	return normalized !== "publish";
};

/**
 * Resolves and verifies site scope before listing non-public content.
 * Session callers must select a site; site-bound API keys may use their bound site.
 */
export async function resolveNonPublicListSiteId({
	req,
	models,
	requestedSiteId,
}: {
	req: Request;
	models: Deps["models"];
	requestedSiteId?: string;
}): Promise<string> {
	const authContext = await resolveRequestAuth(req);
	if (!authContext) {
		throw new ContentAccessError("Unauthorized", 401);
	}

	attachRequestAuth(req, authContext);

	const siteId = requestedSiteId ?? getRequestAuthSiteId(req);
	if (!siteId) {
		if (authContext.method === "apiKey") {
			throw new ContentAccessError("This API key is not bound to a site");
		}
		throw new ContentAccessError(
			"A site must be selected to list non-public content",
			400,
		);
	}

	await assertSiteContentAccess({
		models,
		userId: authContext.userId,
		siteId,
		apiKeySiteId: getRequestAuthSiteId(req),
	});

	return siteId;
}

/** Used by authenticated routes to enforce site scope on mutations. */
export async function assertAuthenticatedSiteAccess({
	req,
	models,
	siteId,
}: {
	req: Request;
	models: Deps["models"];
	siteId: string;
}): Promise<void> {
	const userId = getRequestAuthUserId(req);
	if (!userId) {
		throw new ContentAccessError("Unauthorized", 401);
	}

	await assertSiteContentAccess({
		models,
		userId,
		siteId,
		apiKeySiteId: getRequestAuthSiteId(req),
	});
}
