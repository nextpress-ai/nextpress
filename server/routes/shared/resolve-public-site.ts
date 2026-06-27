import type { Request } from "express";
import type { Site } from "@shared/schema-types";
import type { Deps } from "./deps";

const normalizeHostname = (value: string): string => {
	const trimmed = value.trim().toLowerCase();
	if (!trimmed) return "";
	try {
		const withProtocol = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
		return new URL(withProtocol).hostname.toLowerCase();
	} catch {
		return trimmed.replace(/^https?:\/\//, "").split("/")[0]?.split(":")[0] ?? trimmed;
	}
};

/**
 * Resolves which site a public request belongs to.
 * Order: explicit siteId hint → Host header match on sites.siteUrl → default site.
 */
export const resolvePublicSite = async (params: {
	models: Deps["models"];
	req: Request;
	siteIdHint?: string;
}): Promise<Site | undefined> => {
	const { models, req, siteIdHint } = params;

	if (siteIdHint) {
		const hinted = await models.sites.findById(siteIdHint);
		if (hinted) return hinted;
	}

	const requestHost = normalizeHostname(req.get("host") ?? "");
	if (requestHost) {
		const matched = await models.sites.findByHostname(requestHost);
		if (matched) return matched;
	}

	return models.sites.findDefaultSite();
};

/** Reads optional public site hint from query string. */
export const readPublicSiteIdHint = (req: Request): string | undefined => {
	const raw = req.query.siteId;
	return typeof raw === "string" && raw.trim() ? raw.trim() : undefined;
};
