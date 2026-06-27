import type { Request } from "express";
import type { Deps } from "./deps";
import { CONFIG } from "../../config";
import { resolvePublicSite, readPublicSiteIdHint } from "./resolve-public-site";

export type SiteRenderContext = {
	site: NonNullable<Awaited<ReturnType<typeof resolvePublicSite>>>;
	settings: {
		name: string;
		description: string;
		url: string;
	};
};

/**
 * Resolves public site + theme/render settings from Host header or ?siteId= hint.
 */
export const resolveSiteRenderContext = async (params: {
	models: Deps["models"];
	req: Request;
}): Promise<SiteRenderContext | undefined> => {
	const site = await resolvePublicSite({
		models: params.models,
		req: params.req,
		siteIdHint: readPublicSiteIdHint(params.req),
	});
	if (!site) return undefined;

	const stored = await params.models.sites.getSettings(site.id);
	const fallbackUrl = `${params.req.protocol}://${params.req.get("host")}`;

	return {
		site,
		settings: {
			name: stored.general.siteName || site.name || CONFIG.SITE.DEFAULT_NAME,
			description: stored.general.siteDescription || CONFIG.SITE.DEFAULT_DESCRIPTION,
			url: stored.general.siteUrl || site.siteUrl || fallbackUrl,
		},
	};
};
