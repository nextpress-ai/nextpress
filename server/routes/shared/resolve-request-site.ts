import type { Request } from "express";
import type { Site } from "@shared/schema-types";
import type { Deps } from "./deps";
import { resolveAccessibleSites } from "./resolve-accessible-sites";

/** Reads optional `siteId` from query string or JSON body. */
export const readRequestSiteId = (req: Request): string | undefined => {
	const fromQuery = req.query.siteId;
	if (typeof fromQuery === "string" && fromQuery.trim()) {
		return fromQuery.trim();
	}

	const fromBody = (req.body as { siteId?: unknown } | undefined)?.siteId;
	if (typeof fromBody === "string" && fromBody.trim()) {
		return fromBody.trim();
	}

	return undefined;
};

/**
 * Resolves the site for a settings/site mutation.
 * Uses explicit siteId when provided (with access check); otherwise default site.
 */
export const resolveRequestSite = async (params: {
	models: Deps["models"];
	userId: string;
	siteId?: string;
}): Promise<Site> => {
	const { models, userId, siteId } = params;

	if (siteId) {
		const accessible = await resolveAccessibleSites({ models, userId });
		if (!accessible.some((site) => site.id === siteId)) {
			throw new Error("Site not accessible");
		}

		const site = await models.sites.findById(siteId);
		if (!site) throw new Error("Site not found");
		return site;
	}

	const defaultSite = await models.sites.findDefaultSite();
	if (!defaultSite) throw new Error("No site found");
	return defaultSite;
};
